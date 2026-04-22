from flask import Blueprint, jsonify
from models import Stop, CompanySettings

public_bp = Blueprint("public", __name__, url_prefix="/api/public")


@public_bp.get("/stops")
def get_stops():
    stops = (
        Stop.query.filter_by(is_active=True)
        .order_by(Stop.sort_order.asc(), Stop.id.asc())
        .all()
    )
    return jsonify([stop.to_dict() for stop in stops]), 200


@public_bp.get("/settings")
def get_settings():
    settings = CompanySettings.query.first()
    if not settings:
        return jsonify({"message": "Settings not found"}), 404
    return jsonify(settings.to_dict()), 200