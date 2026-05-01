import threading
import webview
from app import app

def run_flask():
    app.run(port=5000, debug=False, use_reloader=False)
def run_flask():
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
def main():
    flask_thread = threading.Thread(target=run_flask, daemon=True)
    flask_thread.start()

    import time
    time.sleep(1.5)

    webview.create_window(
        'SentraGuard',
        'http://127.0.0.1:5000',
        width=1280,
        height=800,
        resizable=True
    )
    webview.start()

if __name__ == '__main__':
    main()
