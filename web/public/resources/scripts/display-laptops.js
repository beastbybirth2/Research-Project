const API_URL = 'http://localhost:5000/api/laptops';
const API_URL_TEST = `${API_URL}/test`;

// fetch data from MongoDB
const fetchData = async () => {
  const data = await $.get(`${API_URL}`)
  console.log(data)
  return data;
};

// create a card element with the given data
const createCard = (data) => {
  const card = document.createElement('div');
  card.classList.add('col-md-4');
  
  card.innerHTML = `
    <div class="card" id="${data._id}">
      <div class="card-body">
        <h5 class="card-title">${data.name}</h5>
        <img class="card-img-top" src="${data.image}" alt="${data.name}">
        <p class="card-text">${data.description}</p>
        <h6>Price: $${data.price}</h6>
        <div class="card-footer">
          <button class="btn btn-primary buy-button" ${data.instock ? '' : 'disabled'}>
            <i class="fa-solid fa-shopping-cart"></i> Buy Now
          </button>
          <button class="btn btn-danger remove-button" style="float: right">
            <i class="fa-solid fa-trash-can"></i> Remove
          </button>
        </div>
      </div>
    </div>
  `;

  return card;
};

// create a container element to hold the cards
const container = document.createElement('div');
container.classList.add('container');

// fetch the data and create a card for each item
fetchData().then((data) => {
  const rows = Math.ceil(data.length / 3); // calculate number of rows needed

  for (let i = 0; i < rows; i++) {
    const row = document.createElement('div');
    row.classList.add('row');

    for (let j = i * 3; j < i * 3 + 3 && j < data.length; j++) {
      const cardData = data[j];

      const card = createCard(cardData);

      // skip this iteration if the row element is undefined
      if (!row) {
        console.error('Error: row element is undefined');
        continue;
      }

      row.appendChild(card);
    }
    container.appendChild(row);
  }

  // add the container to the page
  document.body.appendChild(container);

  // get all remove buttons and add an event listener for clicks
  const removeButtons = document.querySelectorAll('.remove-button');
  removeButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      // get the card associated with this remove button and remove it from the DOM
      const card = e.target.closest('.card');
      console.log(card);
      
      $.post(`${API_URL}/laptops/delete`, card.id)
      card.remove();
    });
  });

  // get all buy buttons and add an event listener for clicks
  const buyButtons = document.querySelectorAll('.buy-button');
  buyButtons.forEach((button) => {
    button.addEventListener('click', (e) => {
      // get the card associated with this buy button and disable its buy button
      const card = e.target.closest('.card');
      const buyButton = card.querySelector('.buy-button');
      buyButton.disabled = true;
    });
  });
});
