document.getElementById('api-btn').addEventListener('click', async () => {
    const response = await fetch('/api/hello');
    const data = await response.json();
    document.getElementById('api-response').textContent = data.message;
});
