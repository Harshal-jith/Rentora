from django import forms
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError
from datetime import date
from .models import Property, Booking

class BookingForm(forms.ModelForm):
    class Meta:
        model = Booking
        fields = ['property', 'renter_name', 'renter_email', 'renter_phone', 'check_in', 'check_out', 'guests', 'notes']

    def clean_check_in(self):
        check_in = self.cleaned_data.get('check_in')
        if check_in and check_in < date.today():
            raise ValidationError("Move-in date cannot be in the past.")
        return check_in

    def clean_guests(self):
        guests = self.cleaned_data.get('guests')
        if guests is not None and guests < 1:
            raise ValidationError("Guests must be at least 1.")
        return guests

class PropertyForm(forms.ModelForm):
    class Meta:
        model = Property
        fields = ['title', 'description', 'rent', 'city', 'address', 'category', 'bedrooms', 'bathrooms', 'area', 'furnished', 'parking', 'image', 'image_file']

class UserSignupForm(forms.Form):
    username = forms.CharField(max_length=150)
    email = forms.EmailField()
    password = forms.CharField(widget=forms.PasswordInput)

    def clean_username(self):
        username = self.cleaned_data.get('username')
        if User.objects.filter(username=username).exists():
            raise ValidationError("Username is already taken.")
        return username

class UserLoginForm(forms.Form):
    username = forms.CharField()
    password = forms.CharField(widget=forms.PasswordInput)
