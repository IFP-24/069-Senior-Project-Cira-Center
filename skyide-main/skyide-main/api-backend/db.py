import os

from dotenv import load_dotenv
from psycopg2 import pool

load_dotenv()

_db_pool = None


def get_db_config():
    db_user = os.getenv("DB_USER") or os.getenv("USER")
    config = {
        "host": os.getenv("DB_HOST", "127.0.0.1"),
        "port": os.getenv("DB_PORT", "5432"),
        "dbname": os.getenv("DB_NAME", "skyide"),
        "user": db_user,
        "password": os.getenv("DB_PASSWORD", ""),
    }

    if not config["user"]:
        raise RuntimeError("Database configuration missing DB_USER")

    return config


def get_db_pool():
    global _db_pool
    if _db_pool is None:
        _db_pool = pool.SimpleConnectionPool(1, 20, **get_db_config())
    return _db_pool


def get_connection():
    return get_db_pool().getconn()


def release_connection(conn):
    if conn is not None and _db_pool is not None:
        _db_pool.putconn(conn)


def close_db_pool():
    global _db_pool
    if _db_pool is not None:
        _db_pool.closeall()
        _db_pool = None
