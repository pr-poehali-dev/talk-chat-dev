import json
import os
import hashlib
import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: dict, context) -> dict:
    '''API для регистрации и авторизации пользователей Talk Chat'''
    
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            },
            'body': ''
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'})
        }
    
    body = json.loads(event.get('body', '{}'))
    action = body.get('action')
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    
    try:
        if action == 'register':
            email = body.get('email', '').strip().lower()
            username = body.get('username', '').strip().lower()
            password = body.get('password', '')
            
            if not email or '@' not in email:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Некорректный email адрес'})
                }
            
            if not username or len(username) < 3:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Username должен быть минимум 3 символа'})
                }
            
            if not password or len(password) < 6:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'Пароль должен быть минимум 6 символов'})
                }
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT id FROM users WHERE email = %s", (email,))
                if cur.fetchone():
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Email уже зарегистрирован'})
                    }
                
                cur.execute("SELECT id FROM users WHERE username = %s", (username,))
                if cur.fetchone():
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Username занят'})
                    }
                
                verification_code = ''.join([str(random.randint(0, 9)) for _ in range(6)])
                password_hash = hashlib.sha256(password.encode()).hexdigest()
                
                cur.execute(
                    "INSERT INTO users (email, username, password_hash, verification_code) VALUES (%s, %s, %s, %s) RETURNING id",
                    (email, username, password_hash, verification_code)
                )
                user_id = cur.fetchone()['id']
                conn.commit()
                
                send_verification_email(email, verification_code)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Код отправлен на почту', 'user_id': user_id})
                }
        
        elif action == 'verify':
            user_id = body.get('user_id')
            code = body.get('code', '').strip()
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute("SELECT verification_code FROM users WHERE id = %s", (user_id,))
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Пользователь не найден'})
                    }
                
                if user['verification_code'] != code:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Неверный код'})
                    }
                
                cur.execute("UPDATE users SET is_verified = TRUE, verification_code = NULL WHERE id = %s", (user_id,))
                conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Email подтвержден', 'user_id': user_id})
                }
        
        elif action == 'login':
            email = body.get('email', '').strip().lower()
            password = body.get('password', '')
            password_hash = hashlib.sha256(password.encode()).hexdigest()
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT id, username, avatar_url, is_verified FROM users WHERE email = %s AND password_hash = %s",
                    (email, password_hash)
                )
                user = cur.fetchone()
                
                if not user:
                    return {
                        'statusCode': 401,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Неверный email или пароль'})
                    }
                
                if not user['is_verified']:
                    return {
                        'statusCode': 403,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Email не подтвержден'})
                    }
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'user': {
                            'id': user['id'],
                            'username': user['username'],
                            'avatar_url': user['avatar_url']
                        }
                    })
                }
        
        else:
            return {
                'statusCode': 400,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'error': 'Неизвестное действие'})
            }
    
    finally:
        conn.close()


def send_verification_email(to_email: str, code: str):
    smtp_host = os.environ.get('SMTP_HOST')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    smtp_user = os.environ.get('SMTP_USER')
    smtp_password = os.environ.get('SMTP_PASSWORD')
    
    if not all([smtp_host, smtp_user, smtp_password]):
        return
    
    msg = MIMEMultipart()
    msg['From'] = smtp_user
    msg['To'] = to_email
    msg['Subject'] = 'Код подтверждения Talk Chat'
    
    html_body = f'''
    <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%); padding: 40px; border-radius: 20px; color: white;">
                <h1 style="text-align: center;">Talk Chat</h1>
                <p style="font-size: 18px; text-align: center;">Ваш код подтверждения:</p>
                <div style="background: white; color: #333; padding: 20px; border-radius: 10px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; margin: 20px 0;">
                    {code}
                </div>
                <p style="text-align: center; font-size: 14px;">Код действителен 10 минут</p>
            </div>
        </body>
    </html>
    '''
    
    msg.attach(MIMEText(html_body, 'html'))
    
    try:
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(msg)
        server.quit()
    except Exception:
        pass
