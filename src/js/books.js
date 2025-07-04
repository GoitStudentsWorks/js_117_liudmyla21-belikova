import axios from 'axios';
import iziToast from 'izitoast';
import 'izitoast/dist/css/iziToast.min.css';

const BASE_URL = 'https://books-backend.p.goit.global/books';

const refs = {
  counter: document.querySelector('.books-count'),
  dropdownBtn: document.querySelector('.category-dropdown-btn'),
  dropdownList: document.querySelector('.dropdown-list'),
  categoryList: document.querySelector('.category-list'),
  booksList: document.querySelector('.books-list'),
  showMoreBtn: document.querySelector('.pagination-btn'),
  loader: document.querySelector('.inline-loader'),
};

let visibleBooks = 0;
let allBooks = [];
let booksPerPage = window.innerWidth < 768 ? 10 : 24;
const BATCH_SIZE = 4;
let currentView = isDesktop() ? 'desktop' : 'mobile';
let categories = [];

export async function fetchCategories() {
  try {
    const { data } = await axios.get(`${BASE_URL}/category-list`);
    const result = ['All categories', ...data.map(cat => cat.list_name)];
    console.log('Fetched categories:', result);
    return result;
  } catch (error) {
    iziToast.error({ message: 'Failed to load categories' });
    return [];
  }
}

export async function fetchTopBooks() {
  try {
    const { data } = await axios.get(`${BASE_URL}/top-books`);
    return data.flatMap(item => item.books);
  } catch (error) {
    iziToast.error({ message: 'Failed to load trending books' });
    return [];
  }
}

export async function fetchBooksByCategory(category) {
  try {
    const { data } = await axios.get(
      `${BASE_URL}/category?category=${category}`
    );
    return data;
  } catch (error) {
    iziToast.error({ message: 'Failed to load books by category' });
    return [];
  }
}

export function renderCategoryList(categories) {
  refs.categoryList.innerHTML = categories
    .map(
      name =>
        `<li class="category-item"><button class="category-btn" data-category="${name}">${name}</button></li>`
    )
    .join('');
}

export function renderDropdown(categories) {
  console.log('Rendering dropdown...');
  refs.dropdownList.innerHTML = categories
    .map(
      name => `<li class="dropdown-item" data-category="${name}">${name}</li>`
    )
    .join('');
}

export function renderBooks(books, { append = false } = {}) {
  const markup = books
    .map(
      ({ book_image, title, author, _id }) => `
        <li class="book-card">
          <img src="${book_image}" alt="${title}" width="340" height="484" loading="lazy"/>
          <div class="book-card-elements-wrapper">
            <div class="book-card-title-wrapper">
              <h4>${title}</h4>
              <p>${author}</p>
            </div>
            <p>9,99 $</p>
          </div>
          <button class="learn-more-btn" data-id="${_id}">Learn More</button>
        </li>
      `
    )
    .join('');

  if (append) {
    refs.booksList.insertAdjacentHTML('beforeend', markup);
  } else {
    refs.booksList.innerHTML = markup;
  }
}

export function updateCounter(visible, total) {
  refs.counter.textContent = `Showing ${visible} of ${total}`;
}

export async function loadMoreBooks() {
  showLoader();
  const nextBatch = allBooks.slice(visibleBooks, visibleBooks + BATCH_SIZE);
  renderBooks(nextBatch, { append: true });
  visibleBooks += nextBatch.length;
  updateCounter(visibleBooks, allBooks.length);

  await waitForImagesToLoad(refs.booksList);
  hideLoader();

  if (visibleBooks >= allBooks.length) {
    refs.showMoreBtn.classList.add('hidden');
  }
}

export async function initBooksSection() {
  const categories = await fetchCategories();
  updateCategoryView(categories);
  if (isDesktop()) {
    renderCategoryList(categories);
  } else {
    renderDropdown(categories);
  }

  // dropdown listeners
  refs.dropdownBtn.addEventListener('click', () => {
    refs.dropdownList.classList.toggle('is-open');
  });

  refs.dropdownList.addEventListener('click', e => {
    const li = e.target.closest('li[data-category]');
    if (!li) return;
    const category = li.dataset.category;
    refs.dropdownBtn.querySelector('.category-dropdown-label').textContent =
      category;
    loadBooksByCategory(category);
    refs.dropdownList.classList.remove('is-open');
  });

  refs.categoryList.addEventListener('click', e => {
    const btn = e.target.closest('[data-category]');
    if (!btn) return;
    loadBooksByCategory(btn.dataset.category);
  });

  refs.showMoreBtn.addEventListener('click', loadMoreBooks);

  await loadTrendingBooks();
}

async function loadTrendingBooks() {
  showLoader();
  const books = await fetchTopBooks();
  renderFirstBooks(books);
}

async function loadBooksByCategory(category) {
  showLoader();
  if (category === 'All categories') {
    await loadTrendingBooks();
    return;
  }

  const books = await fetchBooksByCategory(category);
  hideLoader();
  renderFirstBooks(books);
}

async function renderFirstBooks(books) {
  showLoader();

  visibleBooks = 0;
  allBooks = books;

  const initialBooks = books.slice(0, booksPerPage);
  renderBooks(initialBooks);
  visibleBooks = initialBooks.length;
  updateCounter(initialBooks.length, books.length);

  await waitForImagesToLoad(refs.booksList);
  hideLoader();

  // контролюємо видимість кнопки
  refs.showMoreBtn.classList.toggle('hidden', books.length <= booksPerPage);
}

function isDesktop() {
  return window.innerWidth >= 1440;
}

function showLoader() {
  refs.loader.classList.remove('hidden');
}

function hideLoader() {
  refs.loader.classList.add('hidden');
}

function waitForImagesToLoad(container) {
  const images = container.querySelectorAll('img');
  const promises = Array.from(images).map(
    img =>
      new Promise(resolve => {
        if (img.complete) {
          resolve(); // already loaded
        } else {
          img.addEventListener('load', resolve);
          img.addEventListener('error', resolve); // на випадок помилки
        }
      })
  );
  return Promise.all(promises);
}

window.addEventListener('resize', () => {
  const isNowDesktop = isDesktop();
  if (
    (isNowDesktop && currentView === 'mobile') ||
    (!isNowDesktop && currentView === 'desktop')
  ) {
    currentView = isNowDesktop ? 'desktop' : 'mobile';
    updateCategoryView(categories);
  }
});

function updateCategoryView(categoriesData) {
  if (isDesktop()) {
    renderCategoryList(categoriesData);
    refs.dropdownList.innerHTML = '';
  } else {
    renderDropdown(categoriesData);
    refs.categoryList.innerHTML = '';
  }
}

initBooksSection();
