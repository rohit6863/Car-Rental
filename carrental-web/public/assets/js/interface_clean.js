/* 
 * Car Rental Portal - Main JavaScript
 * Cleaned version without testimonial and subscriber functionality
 */

$(document).ready(function() {
  // Initialize Bootstrap components
  $('[data-toggle="tooltip"]').tooltip();
  $('[data-toggle="popover"]').popover();
  
  // Initialize tabs
  $('.nav-tabs a').click(function(e) {
    e.preventDefault();
    $(this).tab('show');
  });
  
  // Vehicle detail image slider
  if ($('#listing_img_slider').length) {
    $('#listing_img_slider').slick({
      dots: true,
      infinite: true,
      speed: 500,
      fade: true,
      cssEase: 'linear',
      adaptiveHeight: true,
      autoplay: true,
      autoplaySpeed: 4000
    });
  }
  
  // Date picker initialization
  $('.datepicker').datepicker({
    format: 'yyyy-mm-dd',
    autoclose: true,
    todayHighlight: true
  });
  
  // Form validation
  $('form').on('submit', function(e) {
    if (!this.checkValidity()) {
      e.preventDefault();
      e.stopPropagation();
    }
    $(this).addClass('was-validated');
  });
  
  // Back to top button
  $(window).scroll(function() {
    if ($(this).scrollTop() > 100) {
      $('#back-top').fadeIn();
    } else {
      $('#back-top').fadeOut();
    }
  });
  
  $('#back-top').click(function() {
    $('body,html').animate({
      scrollTop: 0
    }, 800);
    return false;
  });
  
  // Mobile menu toggle
  $('.navbar-toggle').on('click', function() {
    $('.navbar-collapse').toggleClass('in');
  });
  
  // Search toggle
  $('#search_toggle').on('click', function() {
    $('#header-search-form').toggleClass('active');
  });
  
  // Vehicle search filters
  $('.filter-option').on('change', function() {
    $('#vehicle-filter-form').submit();
  });
  
  // Booking form validation
  $('#booking-form').on('submit', function(e) {
    var startDate = new Date($('#fromdate').val());
    var endDate = new Date($('#todate').val());
    
    if (startDate >= endDate) {
      e.preventDefault();
      alert('End date must be after start date');
    }
  });
  
  // Price calculation
  function calculatePrice() {
    var startDate = new Date($('#fromdate').val());
    var endDate = new Date($('#todate').val());
    var pricePerDay = parseFloat($('#pricePerDay').val());
    
    if (startDate && endDate && pricePerDay) {
      var days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
      if (days > 0) {
        var totalPrice = days * pricePerDay;
        $('#totalPrice').text('₹' + totalPrice.toFixed(2));
      }
    }
  }
  
  $('#fromdate, #todate').on('change', calculatePrice);
  
  // Initialize modal login/register forms
  $('.btn').on('click', function() {
    var target = $(this).attr('href');
    if (target && target.startsWith('#') && $(target).hasClass('modal')) {
      $(target).modal('show');
      return false;
    }
  });
}); 