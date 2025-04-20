from flask import Flask, Blueprint

bp = Blueprint('hello_world', __name__)

@bp.route('/hello', methods=['GET'])
def hello():
    return 'Hello, Engiyn!'


def register_http(app: Flask):
    app.register_blueprint(bp)
