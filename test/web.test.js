
const axios = require('axios');
API_URL = "http://localhost:3000/"

//add page url here
test('GET Cards page', async () => {
    const response = await axios.get(`${API_URL}/home`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch('text/html');
    // Add more tests here to check the content of the HTML page
  });
  test('GET Login Page', async () => {
    const response = await axios.get(`${API_URL}/users/login`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch('text/html');
    // Add more tests here to check the content of the HTML page
  });
  test('GET Register Page', async () => {
    const response = await axios.get(`${API_URL}/users/register`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch('text/html');
    // Add more tests here to check the content of the HTML page
  });
  test('GET /aboutProject should return a valid HTML page', async () => {
    const response = await axios.get(`${API_URL}/about`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch('text/html');
    // Add more tests here to check the content of the HTML page
  });



  test('GET Stats page', async () => {
    const response = await axios.get(`${API_URL}/stats`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch('text/html');
    // Add more tests here to check the content of the HTML page
  });
  
  test('GET Developers page', async () => {
    const response = await axios.get(`${API_URL}/me`);
    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch('text/html');
    // Add more tests here to check the content of the HTML page
  });
    
  
  