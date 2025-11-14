from app.app import app
from app.config import DebugConfig as cfg

if __name__ == "__main__":
    app.run(host=cfg.HOST, port=cfg.PORT, debug=cfg.DEBUG)
