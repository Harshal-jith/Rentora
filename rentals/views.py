import json
import csv
import io
import qrcode
from django.http import HttpResponse, JsonResponse
from django.shortcuts import render, get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.core.mail import send_mail
from django.core.paginator import Paginator
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.contrib import messages
from django.db.models import Count, Sum
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from .models import Property, PropertyImage, Amenity, Booking, ActivityLog
from .forms import BookingForm, UserSignupForm, UserLoginForm

def log_activity(request, action, details=""):
    try:
        user = request.user if request.user.is_authenticated else None
        ip = request.META.get('REMOTE_ADDR')
        ActivityLog.objects.create(user=user, action=action, details=details, ip_address=ip)
    except Exception as e:
        print(f"Log activity warning: {e}")

def index_view(request):
    messages.info(request, "Welcome to Rentora Luxury Estate Rentals!")
    return render(request, 'rentals/index.html')

def api_properties(request):
    properties_qs = Property.objects.prefetch_related('gallery_images', 'amenity_list').all()
    
    # Optional Pagination support
    page_number = request.GET.get('page')
    page_size = request.GET.get('page_size', 20)
    
    if page_number:
        paginator = Paginator(properties_qs, page_size)
        page_obj = paginator.get_page(page_number)
        properties = page_obj.object_list
    else:
        properties = properties_qs

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
            'image': p.image_file.url if p.image_file else p.image,
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

        form_data = {
            'property': prop.id,
            'renter_name': body.get('fullName', 'Guest Renter'),
            'renter_email': body.get('email'),
            'renter_phone': body.get('phone', ''),
            'check_in': body.get('checkIn'),
            'check_out': body.get('checkOut', body.get('checkIn')),
            'guests': int(body.get('guests', 1)),
            'notes': body.get('specialRequests', '')
        }

        form = BookingForm(form_data)
        if not form.is_valid():
            errors = [f"{field}: {', '.join(msgs)}" for field, msgs in form.errors.items()]
            return JsonResponse({'error': '; '.join(errors)}, status=400)

        booking = form.save(commit=False)
        booking.total_price = float(body.get('totalPrice', prop.rent))
        if request.user.is_authenticated:
            booking.user = request.user
        booking.save()

        log_activity(request, "CREATE_BOOKING", f"Booking #{booking.id} created for {prop.title} by {booking.renter_name}")

        # Dispatch automated confirmation email
        subject = f"Booking Submitted: {prop.title} [#{booking.id}]"
        message = f"Hello {booking.renter_name},\n\nYour reservation request for {prop.title} has been received!\n\nBooking ID: #{booking.id}\nCheck-in: {booking.check_in}\nTotal Rent: ₹{booking.total_price:,.0f}\n\nOur team will review your request shortly.\n\nBest regards,\nRentora Concierge"
        
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

@csrf_exempt
def api_cancel_booking(request, booking_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST method required'}, status=405)

    try:
        booking = get_object_or_404(Booking, id=booking_id)
        
        if booking.user and request.user.is_authenticated and booking.user != request.user and not request.user.is_superuser:
            return JsonResponse({'error': 'Unauthorized to cancel this booking'}, status=403)

        booking.status = 'Cancelled'
        booking.save()

        # Log Activity
        log_activity(request, "CANCEL_BOOKING", f"Booking #{booking.id} cancelled for {booking.property.title}")

        # Send cancellation notification email
        subject = f"Rentora Booking Cancellation Notice: #{booking.id}"
        message = (
            f"Hello {booking.renter_name},\n\n"
            f"Your reservation request for {booking.property.title} [Booking #{booking.id}] has been successfully cancelled as per your verified request.\n\n"
            f"If you have any questions regarding refunds or policies, please contact our support desk.\n\n"
            f"Best regards,\n"
            f"Rentora Customer Care"
        )
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[booking.renter_email],
                fail_silently=True
            )
        except Exception as e:
            print(f"Cancellation email dispatch warning: {e}")

        return JsonResponse({
            'success': True,
            'bookingId': booking.id,
            'status': booking.status,
            'message': f'Booking #{booking.id} has been verified and cancelled.'
        })
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

# User Authentication API Endpoints
@csrf_exempt
def api_signup(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        body = json.loads(request.body)
        form = UserSignupForm(body)
        if not form.is_valid():
            errors = [f"{field}: {', '.join(msgs)}" for field, msgs in form.errors.items()]
            return JsonResponse({'error': '; '.join(errors)}, status=400)
        
        user = User.objects.create_user(
            username=form.cleaned_data['username'],
            email=form.cleaned_data['email'],
            password=form.cleaned_data['password']
        )
        login(request, user)
        log_activity(request, "USER_SIGNUP", f"New user account created: {user.username} ({user.email})")

        # Dispatch Welcome & Thank You for Registering Email
        subject = "Welcome to Rentora - Thank You for Registering!"
        message = (
            f"Hello {user.username},\n\n"
            f"Thank you for registering an account with Rentora Luxury Estate Rentals!\n\n"
            f"Account Details:\n"
            f"• Username: {user.username}\n"
            f"• Email: {user.email}\n\n"
            f"You can now browse verified rental properties, check real-time availability, and submit reservation requests directly.\n\n"
            f"Best regards,\n"
            f"Rentora Executive Team"
        )
        try:
            send_mail(
                subject=subject,
                message=message,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True
            )
        except Exception as mail_err:
            print(f"Welcome email warning: {mail_err}")

        return JsonResponse({'success': True, 'username': user.username, 'email': user.email})
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def api_login(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'POST required'}, status=405)
    try:
        body = json.loads(request.body)
        form = UserLoginForm(body)
        if not form.is_valid():
            return JsonResponse({'error': 'Invalid credentials format'}, status=400)
        
        username = form.cleaned_data['username']
        password = form.cleaned_data['password']
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            log_activity(request, "USER_LOGIN", f"User logged in: {user.username}")
            return JsonResponse({'success': True, 'username': user.username, 'email': user.email})
        else:
            return JsonResponse({'error': 'Invalid username or password'}, status=401)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@csrf_exempt
def api_logout(request):
    logout(request)
    return JsonResponse({'success': True})

def api_user_status(request):
    if request.user.is_authenticated:
        return JsonResponse({
            'authenticated': True,
            'username': request.user.username,
            'email': request.user.email,
            'is_superuser': request.user.is_superuser
        })
    return JsonResponse({'authenticated': False})

def api_user_bookings(request):
    if request.user.is_authenticated:
        bookings_qs = Booking.objects.select_related('property').filter(user=request.user)
        if not bookings_qs.exists():
            bookings_qs = Booking.objects.select_related('property').all()[:10]
    else:
        bookings_qs = Booking.objects.select_related('property').all()[:10]

    data = []
    for b in bookings_qs:
        data.append({
            'id': b.id,
            'propertyTitle': b.property.title,
            'propertyAddress': f"{b.property.address}, {b.property.city}",
            'checkIn': b.check_in.strftime('%Y-%m-%d') if b.check_in else '',
            'totalPrice': float(b.total_price),
            'status': b.status
        })
    return JsonResponse(data, safe=False)

# BONUS FEATURE: CSV Export Endpoint
def api_export_bookings_csv(request):
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="rentora_bookings_report.csv"'

    writer = csv.writer(response)
    writer.writerow(['Booking ID', 'Property Title', 'Renter Name', 'Renter Email', 'Phone', 'Move-in Date', 'Guests', 'Total Price (INR)', 'Status', 'Created At'])

    bookings = Booking.objects.select_related('property').all()
    for b in bookings:
        writer.writerow([
            b.id,
            b.property.title,
            b.renter_name,
            b.renter_email,
            b.renter_phone,
            b.check_in,
            b.guests,
            f"{b.total_price:.2f}",
            b.status,
            b.created_at.strftime('%Y-%m-%d %H:%M:%S')
        ])

    return response

# BONUS FEATURE: QR Code Generation Endpoint
def api_booking_qrcode(request, booking_id):
    booking = get_object_or_404(Booking, id=booking_id)
    qr_content = f"RENTORA BOOKING PASS\nID: #{booking.id}\nProperty: {booking.property.title}\nRenter: {booking.renter_name}\nMove-in: {booking.check_in}\nStatus: {booking.status}"

    qr = qrcode.QRCode(version=1, box_size=8, border=2)
    qr.add_data(qr_content)
    qr.make(fit=True)

    img = qr.make_image(fill_color="#0f172a", back_color="#ffffff")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    buffer.seek(0)

    return HttpResponse(buffer.getvalue(), content_type="image/png")

# BONUS FEATURE: PDF Receipt Generation Endpoint
def api_booking_pdf(request, booking_id):
    booking = get_object_or_404(Booking, id=booking_id)
    
    buffer = io.BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    
    # Header
    p.setFont("Helvetica-Bold", 22)
    p.setFillColorRGB(0.85, 0.47, 0.02)
    p.drawString(50, 750, "RENTORA LUXURY ESTATES")
    
    p.setFont("Helvetica", 10)
    p.setFillColorRGB(0.3, 0.3, 0.3)
    p.drawString(50, 735, "Official Reservation Confirmation & Receipt")
    p.line(50, 725, 550, 725)
    
    # Details
    p.setFont("Helvetica-Bold", 14)
    p.setFillColorRGB(0.06, 0.09, 0.16)
    p.drawString(50, 690, f"Booking Reference: #{booking.id}")
    
    p.setFont("Helvetica", 11)
    p.drawString(50, 660, f"Property: {booking.property.title}")
    p.drawString(50, 640, f"Location: {booking.property.address}, {booking.property.city}")
    p.drawString(50, 620, f"Renter Name: {booking.renter_name}")
    p.drawString(50, 600, f"Email: {booking.renter_email}")
    p.drawString(50, 580, f"Phone: {booking.renter_phone}")
    p.drawString(50, 560, f"Move-in Date: {booking.check_in}")
    p.drawString(50, 540, f"Number of Guests: {booking.guests}")
    p.drawString(50, 520, f"Reservation Status: {booking.status}")
    
    p.line(50, 500, 550, 500)
    
    p.setFont("Helvetica-Bold", 14)
    p.drawString(50, 470, f"Total Monthly Rent: INR {booking.total_price:,.2f}")
    
    p.setFont("Helvetica-Oblique", 9)
    p.drawString(50, 420, "Thank you for booking with Rentora. Please present this pass upon move-in.")
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    response = HttpResponse(buffer.getvalue(), content_type='application/pdf')
    response['Content-Disposition'] = f'attachment; filename="Rentora_Booking_{booking.id}.pdf"'
    return response

# BONUS FEATURE: Chart.js Analytics Data Endpoint
def api_analytics_data(request):
    total_properties = Property.objects.count()
    total_bookings = Booking.objects.count()
    total_revenue = Booking.objects.aggregate(Sum('total_price'))['total_price__sum'] or 0

    # Categories breakdown
    categories_qs = Property.objects.values('category').annotate(count=Count('id')).order_by('-count')
    cat_labels = [c['category'] for c in categories_qs]
    cat_counts = [c['count'] for c in categories_qs]

    # Status breakdown
    status_qs = Booking.objects.values('status').annotate(count=Count('id'))
    status_labels = [s['status'] for s in status_qs]
    status_counts = [s['count'] for s in status_qs]

    # City breakdown
    city_qs = Property.objects.values('city').annotate(count=Count('id')).order_by('-count')
    city_labels = [ci['city'] for ci in city_qs[:5]]
    city_counts = [ci['count'] for ci in city_qs[:5]]

    return JsonResponse({
        'totalProperties': total_properties,
        'totalBookings': total_bookings,
        'totalRevenue': float(total_revenue),
        'categories': { 'labels': cat_labels, 'counts': cat_counts },
        'statuses': { 'labels': status_labels, 'counts': status_counts },
        'cities': { 'labels': city_labels, 'counts': city_counts }
    })

# ERROR PAGE TESTING VIEWS
def test_404_view(request):
    return render(request, '404.html', status=404)

def test_500_view(request):
    return render(request, '500.html', status=500)


