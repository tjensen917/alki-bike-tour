from flask import Flask, jsonify
from config import Config
from extensions import db, jwt, cors
from routes.public import public_bp
from routes.admin import admin_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": "*"}},
        supports_credentials=False,
    )

    app.register_blueprint(public_bp)
    app.register_blueprint(admin_bp)

    @app.get("/")
    def home():
      return jsonify({"message": "Alki Tour API running"}), 200

    return app


app = create_app()

if __name__ == "__main__":
    app.run(debug=True)