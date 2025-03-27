const axios = require('axios');
API_URL = "http://localhost:5000/api"
test('test api', () => {
    expect.assertions(1);
    return axios.get(`${API_URL}/test`)
        .then(resp => resp.data)
        .then(resp => {
            expect(resp).toEqual('The API is working!');
        });
});
test('test device array', () => {
    expect.assertions(1);
    return axios.get(`${API_URL}/devices`)
        .then(resp => resp.data)
        .then(resp => {
            expect(resp[0].user).toEqual('aditya');
        });
});
test('test laptops array', () => {
    expect.assertions(1);
    return axios.get(`${API_URL}/laptops`)
        .then(resp => resp.data)
        .then(resp => {
            expect(resp[0].user).toEqual('aditya');
        });
});
test('test acs array', () => {
    expect.assertions(1);
    return axios.get(`${API_URL}/acs`)
        .then(resp => resp.data)
        .then(resp => {
            expect(resp[0].user).toEqual('aditya');
        });
});
test('test speakers array', () => {
    expect.assertions(1);
    return axios.get(`${API_URL}/speakers`)
        .then(resp => resp.data)
        .then(resp => {
            expect(resp[0].user).toEqual('lights');
        });
});
test('test thermostats array', () => {
    expect.assertions(1);
    return axios.get(`${API_URL}/thermostats`)
        .then(resp => resp.data)
        .then(resp => {
            expect(resp[0].user).toEqual('aditya');
        });
});
