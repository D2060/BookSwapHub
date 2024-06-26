document.getElementById('ask-now-form').addEventListener('submit', function(event) {
  event.preventDefault();
  showLoading('Requesting Book...');
  const askNowData = {
    bookId: document.getElementById('ask-now-form').dataset.bookId,
    name: document.getElementById('ask-now-name').value,
    email: document.getElementById('ask-now-email').value,
    phone: document.getElementById('ask-now-phone').value,
    id: document.getElementById('ask-now-id').value,
    class: "None"
  };

  fetch('/api/ask-now', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(askNowData)
  })
  .then(response => response.json())
  .then(data => {
    hideLoading();
    alert(data.message);
    if (data.message === 'Request submitted successfully!') {
      document.getElementById('ask-now-form-container').style.visibility = 'hidden';
      document.getElementById('ask-now-form-container').style.opacity = '0';
    }
  })
  .catch(error => {
    console.error('Error:', error);
    hideLoading();
    alert('Failed to submit request. Please try again.');
  });
});

document.getElementById('cancel-ask-now').addEventListener('click', () => {
  document.getElementById('ask-now-form-container').style.visibility = 'hidden';
  document.getElementById('ask-now-form-container').style.opacity = '0';
});
