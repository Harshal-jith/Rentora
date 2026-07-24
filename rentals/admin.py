from django.contrib import admin
from django.core.mail import send_mail
from django.conf import settings
from .models import Property, PropertyImage, Amenity, Booking, ActivityLog

@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'timestamp', 'user', 'action', 'details', 'ip_address')
    list_filter = ('action', 'timestamp')
    search_fields = ('action', 'details', 'user__username', 'ip_address')

class PropertyImageInline(admin.TabularInline):
    model = PropertyImage
    extra = 1

class AmenityInline(admin.TabularInline):
    model = Amenity
    extra = 1

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ('title', 'city', 'category', 'rent', 'bedrooms', 'bathrooms', 'available', 'rating')
    list_filter = ('city', 'category', 'furnished', 'parking', 'available')
    search_fields = ('title', 'description', 'address', 'city')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [PropertyImageInline, AmenityInline]

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ('id', 'renter_name', 'renter_email', 'property', 'check_in', 'check_out', 'status', 'total_price', 'created_at')
    list_filter = ('status', 'check_in', 'created_at')
    search_fields = ('renter_name', 'renter_email', 'renter_phone', 'property__title')
    list_editable = ('status',)
    actions = ['approve_bookings', 'decline_bookings']

    def approve_bookings(self, request, queryset):
        for booking in queryset:
            booking.status = 'Approved'
            booking.save()
            self.send_status_email(booking, 'approved')
        self.message_user(request, f"Approved {queryset.count()} booking(s) and dispatched notification emails.")

    def decline_bookings(self, request, queryset):
        for booking in queryset:
            booking.status = 'Declined'
            booking.save()
            self.send_status_email(booking, 'rejected')
        self.message_user(request, f"Declined {queryset.count()} booking(s) and dispatched notification emails.")

    approve_bookings.short_description = "Approve selected bookings & send confirmation emails"
    decline_bookings.short_description = "Decline selected bookings & send notification emails"

    def send_status_email(self, booking, event_type):
        subject = f"Rentora Booking Status Update: #{booking.id}"
        message = f"Hello {booking.renter_name},\n\nYour reservation status for {booking.property.title} has been updated to: {booking.status}.\n\nThank you for choosing Rentora."
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[booking.renter_email],
                fail_silently=True
            )
        except Exception as e:
            print(f"Email dispatch warning: {e}")
