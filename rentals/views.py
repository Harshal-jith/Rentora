import json
from django.shortcuts import render, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.conf import settings
from .models import Property, PropertyImage, Amenity, Booking

def index_view(request):
    return render(request, 'rentals/index.html')

def api_properties(request):
    properties = Property.objects.prefetch_related('gallery_images', 'amenity_list').all()
    data = []
    for p in properties:
        images = [img.image_url for img in p.gallery_images.all()]
        if not images:
            images = [p.image]
        amenities = [a.name for a in p.amenity_list.all()]
        data.append({
            'id': p.id,
            'title': p.title,
            'slug': p.slug,
            'description': p.description,
            'rent': float(p.rent),
            'city': p.city,
            'address': p.address,
            'lat': p.lat,
            'lng': p.lng,
            'category': p.category,
            'bedrooms': p.bedrooms,
            'bathrooms': p.bathrooms,
            'area': p.area,
            'furnished': p.furnished,
            'parking': p.parking,
            'available': p.available,
            'image': p.image,
            'images': images,
            'rating': p.rating,
            'reviewsCount': p.reviews_count,
            'amenities': amenities
        })
    return JsonResponse(data, safe=False)

@csrf_exempt
def api_create_booking(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)

    try:
        body = json.loads(request.body)
        property_id = body.get('propertyId')
        prop = get_object_or_404(Property, id=property_id)

        booking = Booking.objects.create(
            property=prop,
            renter_name=body.get('fullName', 'Guest Renter'),
            renter_email=body.get('email'),
            renter_phone=body.get('phone', ''),
            check_in=body.get('checkIn'),
            check_out=body.get('checkOut'),
            guests=int(body.get('guests', 1)),
            total_price=float(body.get('totalPrice', prop.rent)),
            notes=body.get('specialRequests', ''),
            status='Pending'
        )

        # Dispatch automated confirmation email
        subject = f"Booking Submitted: {prop.title} [#{booking.id}]"
        message = f"Hello {booking.renter_name},\n\nYour reservation request for {prop.title} has been received!\n\nBooking ID: #{booking.id}\nCheck-in: {booking.check_in}\nCheck-out: {booking.check_out}\nTotal Rent: ₹{booking.total_price:,.0f}\n\nOur team will review your request shortly.\n\nBest regards,\nRentora Concierge"
        
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

        return JsonResponse({
            'success': True,
            'bookingId': booking.id,
            'status': booking.status,
            'message': 'Reservation request successfully registered in Django database!'
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def api_update_booking_status(request, booking_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)

    try:
        body = json.loads(request.body)
        new_status = body.get('status')
        booking = get_object_or_404(Booking, id=booking_id)
        
        booking.status = new_status
        booking.save()

        # Send notification email
        subject = f"Rentora Reservation Status Update: #{booking.id}"
        message = f"Hello {booking.renter_name},\n\nYour reservation request for {booking.property.title} has been updated to: {booking.status}.\n\nThank you for choosing Rentora."
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

        return JsonResponse({'success': True, 'status': booking.status})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
