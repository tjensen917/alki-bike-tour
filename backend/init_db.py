import os
from dotenv import load_dotenv
from app import create_app
from extensions import db
from models import AdminUser, CompanySettings, Stop

load_dotenv()

app = create_app()

ALL_DEFAULT_STOPS = [
    {
        "name": "Test",
        "latitude": 47.519028,
        "longitude": -122.349239,
        "description": "Test spot.",
        "extended_description": "Testing description.",
        "image_urls": "/images/test-1.jpg\n/images/test-2.jpg",
        "sort_order": 1,
    },
    {
        "name": "Seacrest Marina",
        "latitude": 47.589259,
        "longitude": -122.38043,
        "description": "One of the best skyline views in Seattle.",
        "extended_description": (
            "Seacrest is one of the most memorable starting points along West Seattle’s "
            "waterfront. From here, riders get a wide-open view across Elliott Bay toward "
            "the Seattle skyline. It is a natural place to begin because it immediately "
            "feels scenic, active, and connected to the water."
        ),
        "image_urls": "",
        "sort_order": 2,
    },
    {
        "name": "Luna Park / Duwamish Head",
        "latitude": 47.595206,
        "longitude": -122.387471,
        "description": "Site of Seattle’s historic Luna Park amusement area.",
        "extended_description": (
            "This area connects to the story of Luna Park, once a lively amusement "
            "destination along the shoreline. It gives the tour a strong historic hook "
            "because visitors are standing near a place that once drew crowds for "
            "recreation and entertainment. Even though the park is gone, the location "
            "still carries that sense of history layered into the waterfront."
        ),
        "image_urls": "",
        "sort_order": 3,
    },
    {
        "name": "Alki Beach (Main Strip)",
        "latitude": 47.580529,
        "longitude": -122.407085,
        "description": "The heart of Alki beach culture.",
        "extended_description": (
            "This is the social center of the Alki experience. Riders pass beachgoers, "
            "waterfront views, and one of the most recognizable stretches of shoreline in "
            "West Seattle. It helps connect the tour to the modern-day energy of the "
            "neighborhood while balancing the historical stops."
        ),
        "image_urls": "",
        "sort_order": 4,
    },
    {
        "name": "Statue of Liberty",
        "latitude": 47.57929,
        "longitude": -122.410649,
        "description": "A replica installed in 1952.",
        "extended_description": (
            "The Alki Statue of Liberty replica is one of the most recognizable landmarks "
            "on this route. It gives the tour a fun and surprising moment because visitors "
            "do not expect to find a Liberty statue here along the beach. It works well "
            "as both a photo stop and a story point."
        ),
        "image_urls": "",
        "sort_order": 5,
    },
    {
        "name": "Alki Point Lighthouse",
        "latitude": 47.576274,
        "longitude": -122.419229,
        "description": "Guiding ships for over a century.",
        "extended_description": (
            "The lighthouse is one of the strongest anchors for the tour experience. It "
            "connects the scenic waterfront ride to maritime history and gives visitors a "
            "clear destination along the route. It also creates a natural progression "
            "from beach atmosphere into a more historic and coastal setting."
        ),
        "image_urls": "",
        "sort_order": 6,
    },
    {
        "name": "Bedrock (South of Lighthouse)",
        "latitude": 47.574243,
        "longitude": -122.417725,
        "description": "Rocky shoreline with natural formations.",
        "extended_description": (
            "The shoreline changes character here, which makes this stop feel distinct "
            "from the rest of the route. It adds a more natural and geologic element to "
            "the experience and helps the tour feel like more than a list of landmarks. "
            "It is a quieter, more reflective stop after the lighthouse."
        ),
        "image_urls": "",
        "sort_order": 7,
    },
    {
        "name": "Jack Block Park",
        "latitude": 47.584878,
        "longitude": -122.367839,
        "description": "Underrated skyline and port view.",
        "extended_description": (
            "Jack Block Park offers a different perspective from the beach-focused parts "
            "of the route. It combines city, port, and water views in a way that helps "
            "riders understand the broader working waterfront around West Seattle. This "
            "stop is a strong contrast point and adds variety to the tour."
        ),
        "image_urls": "",
        "sort_order": 8,
    },
    {
        "name": "Salty's on Alki Beach",
        "latitude": 47.586351,
        "longitude": -122.376681,
        "description": " A well-known waterfront restaurant with stunning skyline views and a long-standing place in Seattle dining.",
        "extended_description": (
            " Salty’s on Alki Beach is one of the most recognizable dining spots along the Seattle waterfront. Known for its panoramic views of the city skyline, it offers one of the best vantage points to see downtown Seattle from across Elliott Bay. "

            " The restaurant has been a destination for both locals and visitors for decades, combining fresh seafood with a setting that feels distinctly Northwest. Whether it’s a casual visit or a special occasion, Salty’s has built a reputation around both its food and its location. "

            " Even if you’re not stopping to eat, this spot plays an important role in the experience of the tour. It connects the scenic ride with the lifestyle of the area—where great views, good food, and the waterfront all come together. "
        ),
        "image_urls": "",
        "sort_order": 9,
    },
    {
        "name": "Emma Schmitz Memorial Overlook",
        "latitude": 47.562874,
        "longitude": -122.406359,
        "description": "A peaceful beachfront overlook offering one of the quietest and most scenic views along Alki.",
        "extended_description": (
            "The Emma Schmitz Memorial Overlook offers a quieter, more reflective side of the Alki experience. Tucked away from the busier stretches of the beach, this area provides open shoreline, natural surroundings, and a slower pace. "

            " Named in honor of Emma Schmitz, the park was preserved to protect this section of waterfront and keep it accessible for the public. Today, it stands as a reminder of the importance of preserving natural spaces within a growing city. "

            " From here, you can take in wide views of the water, watch boats pass in the distance, and enjoy a moment of calm away from the more crowded areas. It’s a perfect place to pause, breathe, and appreciate the balance between city life and nature. "
        ),
        "image_urls": "",
        "sort_order": 10,
    },
    {
        "name": "Randie Stone's Flower Houses",
        "latitude": 47.590706,
        "longitude": -122.392573,
        "description": "A colorful stretch of homes transformed into living art with vibrant flowers and unique designs.",
        "extended_description": (
            " Along this stretch of Alki, you’ll find one of the most unique and personal displays of creativity in West Seattle—Randie Stone’s Flower Houses. What began as a simple passion for gardening evolved into a vibrant, ever-changing work of art. "

            " The homes are decorated with bold colors, overflowing planters, and carefully arranged flowers that turn the property into a visual experience rather than just a place to live. Every season brings something new, making it feel alive and constantly evolving. "

            " This stop adds a human element to the tour. It’s not a landmark built by the city—it’s a reflection of one individual’s creativity and dedication. It reminds riders that the character of a place is often shaped by the people who care enough to make it beautiful. "
        ),
        "image_urls": "",
        "sort_order": 11,
    },
    {
        "name": "Fremont Troll",
        "latitude": 47.651065,
        "longitude": -122.347556,
        "description": "Hidden beneath a bridge, this giant troll sculpture has been a quirky Seattle icon since the 1990s.",
        "extended_description": (
            "Beneath the Aurora Bridge in Seattle’s Fremont neighborhood lives one of the " 
            " city’s most unexpected landmarks—the Fremont Troll. Installed in 1990 as part "
            " of a community art project, the sculpture was designed to reclaim the space " 
            " under the bridge from neglect and turn it into something memorable. "
            
            " The troll appears to be emerging from the earth itself, gripping a real Volkswagen "
            " Beetle in one massive hand. It’s a playful nod to folklore, imagination, and the "
            " creative spirit that defines Fremont as a neighborhood. "

            " While it may feel out of place compared to the waterfront stops on this tour, "
            " the Fremont Troll represents a different side of Seattle—one that embraces public art, "
            " humor, and transformation. It’s a reminder that even overlooked spaces can become "
            " something iconic."
        ),
        "image_urls": "",
        "sort_order": 12,
    },
]


with app.app_context():
    db.create_all()

    admin_email = os.getenv("ADMIN_EMAIL", "admin@example.com").strip().lower()
    admin_password = os.getenv("ADMIN_PASSWORD", "changeme123")

    admin = AdminUser.query.filter_by(email=admin_email).first()
    if not admin:
        admin = AdminUser(email=admin_email)
        admin.set_password(admin_password)
        db.session.add(admin)

    settings = CompanySettings.query.first()
    if not settings:
        settings = CompanySettings()
        db.session.add(settings)

    existing_names = {stop.name for stop in Stop.query.all()}

    for stop_data in ALL_DEFAULT_STOPS:
        if stop_data["name"] not in existing_names:
            db.session.add(
                Stop(
                    name=stop_data["name"],
                    latitude=stop_data["latitude"],
                    longitude=stop_data["longitude"],
                    description=stop_data["description"],
                    extended_description=stop_data["extended_description"],
                    image_urls=stop_data["image_urls"],
                    is_active=True,
                    sort_order=stop_data["sort_order"],
                )
            )

    db.session.commit()
    print("Database initialized successfully.")