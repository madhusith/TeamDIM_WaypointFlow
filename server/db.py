"""Database connection shared by the API and seed command."""

import os

import psycopg


def connect():
    return psycopg.connect(os.environ["DATABASE_URL"])
