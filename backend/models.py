from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db


class AdminUser(db.Model):
    __tablename__ = "admin_users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)


class Stop(db.Model):
    __tablename__ = "stops"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=False)
    extended_description = db.Column(db.Text, nullable=False)
    image_urls = db.Column(db.Text, nullable=True, default="")
    is_active = db.Column(db.Boolean, default=True, nullable=False)
    sort_order = db.Column(db.Integer, default=0, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)

    def to_dict(self) -> dict:
        images = []
        if self.image_urls:
            images = [url.strip() for url in self.image_urls.split("\n") if url.strip()]

        return {
            "id": self.id,
            "name": self.name,
            "position": [self.latitude, self.longitude],
            "description": self.description,
            "extendedDescription": self.extended_description,
            "imageUrls": images,
            "isActive": self.is_active,
            "sortOrder": self.sort_order,
        }


class CompanySettings(db.Model):
    __tablename__ = "company_settings"

    id = db.Column(db.Integer, primary_key=True)
    company_name = db.Column(db.String(255), default="Alki Kayak Tours", nullable=False)
    unlock_radius_feet = db.Column(db.Integer, default=20, nullable=False)

    return_latitude = db.Column(db.Float, nullable=False, default=47.589259)
    return_longitude = db.Column(db.Float, nullable=False, default=-122.380430)

    closing_time = db.Column(db.String(5), default="19:30", nullable=False)
    reminder_lead_minutes = db.Column(db.Integer, default=20, nullable=False)
    average_bike_speed_mph = db.Column(db.Float, default=8.0, nullable=False)

    def to_dict(self) -> dict:
        return {
            "companyName": self.company_name,
            "unlockRadiusFeet": self.unlock_radius_feet,
            "returnLocation": [self.return_latitude, self.return_longitude],
            "closingTime": self.closing_time,
            "reminderLeadMinutes": self.reminder_lead_minutes,
            "averageBikeSpeedMph": self.average_bike_speed_mph,
        }