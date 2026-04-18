import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'sentraguard-fallback-key')
    SQLALCHEMY_DATABASE_URI = 'sqlite:///sentraguard.db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SESSION_TYPE = 'filesystem'
    SESSION_PERMANENT = False
