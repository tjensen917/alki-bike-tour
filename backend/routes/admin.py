from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import create_access_token, jwt_required
from models import AdminUser, Stop, CompanySettings
from extensions import db
import os
import uuid
from werkzeug.utils import secure_filename

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.post("/login")
def admin_login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    admin = AdminUser.query.filter_by(email=email).first()
    if not admin or not admin.check_password(password):
        return jsonify({"message": "Invalid credentials"}), 401

    token = create_access_token(identity=str(admin.id))
    return jsonify({"access_token": token}), 200


@admin_bp.get("/stops")
@jwt_required()
def list_stops():
    stops = Stop.query.order_by(Stop.sort_order.asc(), Stop.id.asc()).all()
    return jsonify([stop.to_dict() for stop in stops]), 200


@admin_bp.post("/stops")
@jwt_required()
def create_stop():
    data = request.get_json() or {}

    stop = Stop(
        name=(data.get("name") or "").strip(),
        latitude=float(data.get("latitude")),
        longitude=float(data.get("longitude")),
        description=(data.get("description") or "").strip(),
        extended_description=(data.get("extendedDescription") or "").strip(),
        image_urls="\n".join(data.get("imageUrls", [])),
        is_active=bool(data.get("isActive", True)),
        sort_order=int(data.get("sortOrder", 0)),
    )

    db.session.add(stop)
    db.session.commit()
    return jsonify(stop.to_dict()), 201


@admin_bp.put("/stops/<int:stop_id>")
@jwt_required()
def update_stop(stop_id: int):
    stop = Stop.query.get_or_404(stop_id)
    data = request.get_json() or {}

    stop.name = (data.get("name") or stop.name).strip()
    stop.latitude = float(data.get("latitude", stop.latitude))
    stop.longitude = float(data.get("longitude", stop.longitude))
    stop.description = (data.get("description") or stop.description).strip()
    stop.extended_description = (
        data.get("extendedDescription") or stop.extended_description
    ).strip()
    stop.image_urls = "\n".join(data.get("imageUrls", []))
    stop.is_active = bool(data.get("isActive", stop.is_active))
    stop.sort_order = int(data.get("sortOrder", stop.sort_order))

    db.session.commit()
    return jsonify(stop.to_dict()), 200


@admin_bp.delete("/stops/<int:stop_id>")
@jwt_required()
def delete_stop(stop_id: int):
    stop = Stop.query.get_or_404(stop_id)
    db.session.delete(stop)
    db.session.commit()
    return jsonify({"message": "Stop deleted"}), 200


@admin_bp.get("/settings")
@jwt_required()
def get_admin_settings():
    settings = CompanySettings.query.first()
    return jsonify(settings.to_dict()), 200


@admin_bp.put("/settings")
@jwt_required()
def update_settings():
    settings = CompanySettings.query.first()
    data = request.get_json() or {}

    settings.company_name = (data.get("companyName") or settings.company_name).strip()
    settings.unlock_radius_feet = int(
        data.get("unlockRadiusFeet", settings.unlock_radius_feet)
    )

    return_location = data.get("returnLocation", [])
    if len(return_location) == 2:
        settings.return_latitude = float(return_location[0])
        settings.return_longitude = float(return_location[1])

    settings.closing_time = data.get("closingTime", settings.closing_time)
    settings.reminder_lead_minutes = int(
        data.get("reminderLeadMinutes", settings.reminder_lead_minutes)
    )
    settings.average_bike_speed_mph = float(
        data.get("averageBikeSpeedMph", settings.average_bike_speed_mph)
    )

    db.session.commit()
    return jsonify(settings.to_dict()), 200

@admin_bp.route("/upload-image", methods=["POST"])
@jwt_required()
def upload_image():
    if "image" not in request.files:
        return jsonify({"message": "No image uploaded"}), 400

    file = request.files["image"]

    if file.filename == "":
        return jsonify({"message": "No selected file"}), 400

    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}"

    upload_folder = os.path.join(current_app.root_path, "uploads", "stops")
    os.makedirs(upload_folder, exist_ok=True)

    file_path = os.path.join(upload_folder, unique_name)
    file.save(file_path)

    image_url = f"/uploads/stops/{unique_name}"

    return jsonify({"imageUrl": image_url}), 201