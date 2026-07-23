from django.db import models
from django.utils.text import slugify

class Property(models.Model):
    CATEGORY_CHOICES = [
        ('Luxury Villa', 'Luxury Villa'),
        ('Backwater Estate', 'Backwater Estate'),
        ('Hill Retreat', 'Hill Retreat'),
        ('Heritage Home', 'Heritage Home'),
        ('Penthouse Suite', 'Penthouse Suite'),
        ('Coastal Residence', 'Coastal Residence'),
        ('Studio Loft', 'Studio Loft'),
    ]

    title = models.CharField(max_length=255)
    slug = models.SlugField(unique=True, blank=True, max_length=255)
    description = models.TextField()
    rent = models.DecimalField(max_digits=12, decimal_places=2)
    city = models.CharField(max_length=100)
    address = models.CharField(max_length=255)
    lat = models.FloatField(default=9.9312)
    lng = models.FloatField(default=76.2673)
    category = models.CharField(max_length=100, choices=CATEGORY_CHOICES, default='Luxury Villa')
    bedrooms = models.IntegerField(default=1)
    bathrooms = models.IntegerField(default=1)
    area = models.IntegerField(help_text="Area in sq.ft")
    furnished = models.BooleanField(default=True)
    parking = models.BooleanField(default=True)
    available = models.BooleanField(default=True)
    image = models.CharField(max_length=500, help_text="Main image path or URL")
    rating = models.FloatField(default=4.8)
    reviews_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Properties"
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Property.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.city}) - ₹{self.rent:,.0f}/mo"

class PropertyImage(models.Model):
    property = models.ForeignKey(Property, related_name='gallery_images', on_delete=models.CASCADE)
    image_url = models.CharField(max_length=500)

    def __str__(self):
        return f"Image for {self.property.title}"

class Amenity(models.Model):
    property = models.ForeignKey(Property, related_name='amenity_list', on_delete=models.CASCADE)
    name = models.CharField(max_length=100)

    def __str__(self):
        return f"{self.name} ({self.property.title})"

class Booking(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending ⏳'),
        ('Approved', 'Approved ✅'),
        ('Declined', 'Declined ❌'),
        ('Cancelled', 'Cancelled 🚫'),
    ]

    property = models.ForeignKey(Property, related_name='bookings', on_delete=models.CASCADE)
    renter_name = models.CharField(max_length=150)
    renter_email = models.EmailField()
    renter_phone = models.CharField(max_length=50)
    check_in = models.DateField()
    check_out = models.DateField()
    guests = models.IntegerField(default=1)
    total_price = models.DecimalField(max_digits=12, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending')
    notes = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Booking #{self.id} - {self.renter_name} ({self.property.title}) [{self.status}]"
