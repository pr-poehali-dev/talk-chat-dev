import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для управления чатами и сообщениями'''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    
    try:
        if method == 'GET':
            user_id = event.get('queryStringParameters', {}).get('user_id')
            
            if not user_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'user_id обязателен'})
                }
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute('''
                    SELECT c.id, c.created_at,
                           CASE 
                               WHEN c.user1_id = %s THEN u2.id
                               ELSE u1.id
                           END as other_user_id,
                           CASE 
                               WHEN c.user1_id = %s THEN u2.username
                               ELSE u1.username
                           END as other_username,
                           CASE 
                               WHEN c.user1_id = %s THEN u2.avatar_url
                               ELSE u1.avatar_url
                           END as other_avatar,
                           m.text as last_message,
                           m.created_at as last_message_time
                    FROM chats c
                    LEFT JOIN users u1 ON c.user1_id = u1.id
                    LEFT JOIN users u2 ON c.user2_id = u2.id
                    LEFT JOIN LATERAL (
                        SELECT text, created_at 
                        FROM messages 
                        WHERE chat_id = c.id 
                        ORDER BY created_at DESC 
                        LIMIT 1
                    ) m ON true
                    WHERE c.user1_id = %s OR c.user2_id = %s
                    ORDER BY m.created_at DESC NULLS LAST
                ''', (user_id, user_id, user_id, user_id, user_id))
                
                chats = cur.fetchall()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'chats': [dict(chat) for chat in chats]}, default=str)
                }
        
        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            action = body.get('action')
            
            if action == 'create_chat':
                user1_id = body.get('user1_id')
                user2_id = body.get('user2_id')
                
                if not user1_id or not user2_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'user1_id и user2_id обязательны'})
                    }
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT id FROM chats WHERE (user1_id = %s AND user2_id = %s) OR (user1_id = %s AND user2_id = %s)",
                        (user1_id, user2_id, user2_id, user1_id)
                    )
                    existing = cur.fetchone()
                    
                    if existing:
                        return {
                            'statusCode': 200,
                            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                            'body': json.dumps({'chat_id': existing['id']})
                        }
                    
                    cur.execute(
                        "INSERT INTO chats (user1_id, user2_id) VALUES (%s, %s) RETURNING id",
                        (user1_id, user2_id)
                    )
                    chat_id = cur.fetchone()['id']
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'chat_id': chat_id})
                    }
            
            elif action == 'send_message':
                chat_id = body.get('chat_id')
                sender_id = body.get('sender_id')
                text = body.get('text', '').strip()
                
                if not all([chat_id, sender_id, text]):
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'chat_id, sender_id и text обязательны'})
                    }
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "INSERT INTO messages (chat_id, sender_id, text) VALUES (%s, %s, %s) RETURNING id, created_at",
                        (chat_id, sender_id, text)
                    )
                    message = cur.fetchone()
                    conn.commit()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({
                            'message_id': message['id'],
                            'created_at': str(message['created_at'])
                        })
                    }
            
            elif action == 'get_messages':
                chat_id = body.get('chat_id')
                
                if not chat_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'chat_id обязателен'})
                    }
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT id, sender_id, text, created_at FROM messages WHERE chat_id = %s ORDER BY created_at ASC",
                        (chat_id,)
                    )
                    messages = cur.fetchall()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'messages': [dict(msg) for msg in messages]}, default=str)
                    }
            
            elif action == 'search_users':
                query = body.get('query', '').strip().lower()
                
                if not query:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'query обязателен'})
                    }
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        "SELECT id, username, avatar_url FROM users WHERE username LIKE %s AND is_verified = TRUE LIMIT 20",
                        (f'%{query}%',)
                    )
                    users = cur.fetchall()
                    
                    return {
                        'statusCode': 200,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'users': [dict(user) for user in users]})
                    }
            
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неизвестное действие'})
                }
    
    finally:
        conn.close()
