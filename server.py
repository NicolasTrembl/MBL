import http.server
import socketserver
import os

PORT = 5555
DIRECTORY = "."

class SPAServer(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.translate_path(self.path)
        
        if os.path.isdir(path):
            super().do_GET()
        elif os.path.exists(path):
            super().do_GET()
        else:
            self.path = "/index.html"
            super().do_GET()

with socketserver.TCPServer(("", PORT), SPAServer) as httpd:
    print(f"Serveur SPA lancé sur http://localhost:{PORT}")
    httpd.serve_forever()