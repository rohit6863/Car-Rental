// Booking calculation logic
document.addEventListener('DOMContentLoaded', function() {
    console.log('Booking calculator initialized');

    // Get the input elements
    const fromDateInput = document.getElementById('fromdate');
    const toDateInput = document.getElementById('todate');
    const pricePerDayElement = document.querySelector('.price_info p');
    
    console.log('Elements found:', {
        fromDateInput: !!fromDateInput,
        toDateInput: !!toDateInput,
        pricePerDayElement: !!pricePerDayElement
    });

    // Get price per day
    let pricePerDay = 0;
    if (pricePerDayElement) {
        const priceText = pricePerDayElement.textContent;
        console.log('Price text found:', priceText);
        pricePerDay = parseFloat(priceText.replace('Rs.', '').trim());
        console.log('Parsed price per day:', pricePerDay);
    }

    // Function to calculate the number of days between two dates (inclusive)
    function calculateDays(fromDate, toDate) {
        const start = new Date(fromDate);
        const end = new Date(toDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        
        // Calculate days difference (inclusive of both days)
        const diffTime = end - start;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        
        console.log('Date calculation:', {
            start: start.toISOString(),
            end: end.toISOString(),
            diffTime,
            diffDays
        });
        
        return diffDays;
    }

    // Function to update the total amount
    function updateTotalAmount() {
        console.log('Updating total amount');
        console.log('Current values:', {
            fromDate: fromDateInput.value,
            toDate: toDateInput.value
        });

        if (fromDateInput.value && toDateInput.value) {
            const days = calculateDays(fromDateInput.value, toDateInput.value);
            console.log('Calculated days:', days);

            if (days > 0) {
                const totalAmount = days * pricePerDay;
                console.log('Calculated total:', totalAmount);
                
                // Update displays
                document.getElementById('numberOfDays').textContent = `${days} days`;
                document.getElementById('totalAmount').textContent = `Rs. ${totalAmount}`;
            } else {
                console.log('Invalid date range detected');
                document.getElementById('numberOfDays').textContent = '0 days';
                document.getElementById('totalAmount').textContent = 'Rs. 0';
            }
        }
    }

    // Add event listeners if elements exist
    if (fromDateInput && toDateInput) {
        console.log('Adding event listeners to date inputs');
        
        // Set min date to today
        const today = new Date().toISOString().split('T')[0];
        fromDateInput.min = today;
        toDateInput.min = today;

        fromDateInput.addEventListener('input', function() {
            console.log('From date changed:', this.value);
            updateTotalAmount();
        });

        toDateInput.addEventListener('input', function() {
            console.log('To date changed:', this.value);
            updateTotalAmount();
        });

        // Also listen for 'change' events
        fromDateInput.addEventListener('change', updateTotalAmount);
        toDateInput.addEventListener('change', updateTotalAmount);
    } else {
        console.error('Date input elements not found!');
    }
}); 