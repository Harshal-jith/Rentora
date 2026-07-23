import json
import os
from django.core.management.base import BaseCommand
from rentals.models import Property, PropertyImage, Amenity

class Command(BaseCommand):
    help = 'Seeds all 20 Kerala properties from static data into the Django database'

    def handle(self, *args, **options):
        data_js_path = r"C:\Users\Harshal\.gemini\antigravity\scratch\premium_rentals\data.js"
        
        if not os.path.exists(data_js_path):
            self.stdout.write(self.style.ERROR(f"data.js not found at {data_js_path}"))
            return

        with open(data_js_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Extract JSON array from data.js
        start_idx = content.find('[')
        end_idx = content.rfind(']') + 1
        json_str = content[start_idx:end_idx]

        properties_data = json.loads(json_str)

        Property.objects.all().delete()
        self.stdout.write("Cleared existing property records.")

        created_count = 0
        for item in properties_data:
            prop = Property.objects.create(
                id=item['id'],
                title=item['title'],
                description=item['description'],
                rent=item['rent'],
                city=item['city'],
                address=item['address'],
                lat=item.get('lat', 9.9312),
                lng=item.get('lng', 76.2673),
                category=item.get('category', 'Luxury Villa'),
                bedrooms=item.get('bedrooms', 1),
                bathrooms=item.get('bathrooms', 1),
                area=item.get('area', 1000),
                furnished=item.get('furnished', True),
                parking=item.get('parking', True),
                available=item.get('available', True),
                image=item['image'],
                rating=item.get('rating', 4.8),
                reviews_count=item.get('reviewsCount', 0)
            )

            # Gallery images
            for img_url in item.get('images', []):
                PropertyImage.objects.create(property=prop, image_url=img_url)

            # Amenities
            for amenity_name in item.get('amenities', []):
                Amenity.objects.create(property=prop, name=amenity_name)

            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded {created_count} properties into the Django database!"))
