import json
import os
import urllib.request

def handler(request):
    print(f"Request method: {request.method}")
    print(f"Request body: {request.body}")
    
    # Set CORS headers for all responses
    cors_headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
    }
    
    # Handle OPTIONS preflight
    if request.method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': cors_headers,
            'body': json.dumps({'message': 'OK'})
        }
    
    # Only allow POST
    if request.method != 'POST':
        return {
            'statusCode': 405,
            'headers': cors_headers,
            'body': json.dumps({'error': 'Method not allowed'})
        }

    try:
        data = json.loads(request.body)
        message = data.get('message', '')
        
        if not message:
            return {
                'statusCode': 400,
                'headers': cors_headers,
                'body': json.dumps({'error': 'No message provided'})
            }

        # System prompt
        system_prompt = """You are Eugene's AI assistant on his portfolio website.

ABOUT EUGENE:
- Product designer who also builds (design engineer)
- Currently at Columbia University
- Experience: Dwellci AI (Design Engineer Intern), Columbia Daily Spectator (PM), 
  ToothDoc (Product Design Intern), Voinosis, Color Street
- Skills: Figma, React, Python, FastAPI, JavaScript, Product Design, UI/UX
- Projects: theShaft (Columbia housing platform, 4K+ users), ToothDoc MVP
- Personal: Twin and middle child, problem solver, maker (rug tufting, sewing, 
  dog clothes), solo museum adventurer

GUIDELINES:
- Be conversational, friendly, and authentic to Eugene's voice
- Keep responses concise (2-3 sentences unless detail requested)
- Link to specific portfolio pages when relevant
- If asked about availability, suggest checking the resume or contacting Eugene
- Don't make up information - if unsure, be honest"""

        # Call Groq API
        groq_data = {
            "model": "llama-3.2-3b-instant",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": message}
            ],
            "max_tokens": 200,
            "temperature": 0.7
        }

        api_key = os.environ.get('GROQ_API_KEY')
        print(f"API Key present: {bool(api_key)}")
        
        if not api_key:
            return {
                'statusCode': 500,
                'headers': cors_headers,
                'body': json.dumps({'error': 'GROQ_API_KEY not configured'})
            }

        req = urllib.request.Request(
            "https://api.groq.com/openai/v1/chat/completions",
            data=json.dumps(groq_data).encode('utf-8'),
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json"
            },
            method='POST'
        )

        with urllib.request.urlopen(req) as response:
            groq_response = json.loads(response.read().decode('utf-8'))
            
            if 'choices' in groq_response and len(groq_response['choices']) > 0:
                ai_response = groq_response['choices'][0]['message']['content']
                return {
                    'statusCode': 200,
                    'headers': cors_headers,
                    'body': json.dumps({'response': ai_response})
                }
            else:
                return {
                    'statusCode': 500,
                    'headers': cors_headers,
                    'body': json.dumps({'error': 'No response from AI'})
                }

    except Exception as e:
        print(f"Error: {str(e)}")
        return {
            'statusCode': 500,
            'headers': cors_headers,
            'body': json.dumps({'error': f'Server error: {str(e)}'})
        }
