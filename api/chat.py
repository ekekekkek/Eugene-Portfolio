import os
import json
from http.server import BaseHTTPRequestHandler
import urllib.request
import urllib.parse

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        # Set CORS headers
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

        try:
            # Get the request body
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            message = data.get('message', '')
            if not message:
                self.wfile.write(json.dumps({'error': 'No message provided'}).encode())
                return

            # System prompt with Eugene's information
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

            # Prepare the request to Groq API
            groq_data = {
                "model": "llama-3.2-3b-instant",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": message}
                ],
                "max_tokens": 200,
                "temperature": 0.7
            }

            # Make request to Groq API
            groq_url = "https://api.groq.com/openai/v1/chat/completions"
            groq_headers = {
                "Authorization": f"Bearer {os.environ.get('GROQ_API_KEY')}",
                "Content-Type": "application/json"
            }

            req = urllib.request.Request(
                groq_url,
                data=json.dumps(groq_data).encode('utf-8'),
                headers=groq_headers,
                method='POST'
            )

            with urllib.request.urlopen(req) as response:
                groq_response = json.loads(response.read().decode('utf-8'))
                
                if 'choices' in groq_response and len(groq_response['choices']) > 0:
                    ai_response = groq_response['choices'][0]['message']['content']
                    self.wfile.write(json.dumps({'response': ai_response}).encode())
                else:
                    self.wfile.write(json.dumps({'error': 'No response from AI'}).encode())

        except json.JSONDecodeError:
            self.wfile.write(json.dumps({'error': 'Invalid JSON'}).encode())
        except urllib.error.HTTPError as e:
            error_msg = f"API Error: {e.code}"
            self.wfile.write(json.dumps({'error': error_msg}).encode())
        except Exception as e:
            self.wfile.write(json.dumps({'error': f'Server error: {str(e)}'}).encode())

    def do_OPTIONS(self):
        # Handle preflight CORS requests
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()