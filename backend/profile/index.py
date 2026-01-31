import json
import os
import base64
import uuid
import psycopg2
from psycopg2.extras import RealDictCursor
import boto3

def handler(event: dict, context) -> dict:
    '''API для управления профилем пользователя и загрузки аватара'''
    
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
    
    body = json.loads(event.get('body', '{}')) if method == 'POST' else {}
    user_id = event.get('queryStringParameters', {}).get('user_id') or body.get('user_id')
    
    if not user_id:
        return {
            'statusCode': 400,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'user_id обязателен'})
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    
    try:
        if method == 'GET':
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, email, username, avatar_url FROM users WHERE id = %s",
                    (user_id,)
                )
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Пользователь не найден'})
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'user': dict(user)})
                }
        
        elif method == 'POST':
            action = body.get('action')
            
            if action == 'upload_avatar':
                avatar_base64 = body.get('avatar')
                
                if not avatar_base64:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Изображение не предоставлено'})
                    }
                
                s3 = boto3.client('s3',
                    endpoint_url='https://bucket.poehali.dev',
                    aws_access_key_id=os.environ['AWS_ACCESS_KEY_ID'],
                    aws_secret_access_key=os.environ['AWS_SECRET_ACCESS_KEY']
                )
                
                image_data = base64.b64decode(avatar_base64.split(',')[1] if ',' in avatar_base64 else avatar_base64)
                file_key = f'avatars/{user_id}_{uuid.uuid4()}.jpg'
                
                s3.put_object(
                    Bucket='files',
                    Key=file_key,
                    Body=image_data,
                    ContentType='image/jpeg'
                )
                
                avatar_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{file_key}"
                
                with conn.cursor() as cur:
                    cur.execute(
                        "UPDATE users SET avatar_url = %s WHERE id = %s",
                        (avatar_url, user_id)
                    )
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'avatar_url': avatar_url})
                }
            
            else:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Неизвестное действие'})
                }
    
    finally:
        conn.close()
