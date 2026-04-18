import tkinter as tk
from tkinter import filedialog
from flask import Flask, render_template, redirect, session, jsonify
from config import Config
from backend.auth.models import db
from backend.auth.routes import auth_bp
from backend.encryption.routes import enc_bp
from backend.monitoring.routes import mon_bp
from backend.ids.routes import ids_bp
from backend.alerts.routes import alerts_bp
from backend.auth.user_routes import users_bp

app = Flask(__name__,
    template_folder='frontend/templates',
    static_folder='frontend/static'
)
app.config.from_object(Config)
db.init_app(app)
app.register_blueprint(auth_bp)
app.register_blueprint(enc_bp)
app.register_blueprint(mon_bp)
app.register_blueprint(ids_bp)
app.register_blueprint(alerts_bp)
app.register_blueprint(users_bp)

@app.route('/')
def index():
    if 'user' not in session:
        return redirect('/login')
    return render_template('dashboard.html')

@app.route('/login')
def login_page():
    if 'user' in session:
        return redirect('/')
    return render_template('login.html')

@app.route('/api/pick-file', methods=['GET'])
def pick_file():
    root = tk.Tk()
    root.withdraw()
    root.attributes('-topmost', True)
    path = filedialog.askopenfilename(title="Select File")
    root.destroy()
    if path:
        return jsonify({'path': path}), 200
    return jsonify({'error': 'No file selected'}), 204

with app.app_context():
    db.create_all()
    print("[OK] Database ready")

if __name__ == '__main__':
    app.run(debug=True)
