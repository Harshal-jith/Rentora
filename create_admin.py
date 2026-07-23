import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rentora_project.settings')
django.setup()

from django.contrib.auth.models import User

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@rentora.com', 'admin123')
    print("Created superuser 'admin' with password 'admin123'")
else:
    u = User.objects.get(username='admin')
    u.set_password('admin123')
    u.save()
    print("Updated superuser 'admin' password to 'admin123'")
