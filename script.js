const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const resultsDiv = document.getElementById("results");
const statusText = document.getElementById("status");

const featuredImage = document.getElementById("featuredImage");
const featuredTitle = document.getElementById("featuredTitle");
const featuredArtist = document.getElementById("featuredArtist");
const featuredDate = document.getElementById("featuredDate");
const featuredLink = document.getElementById("featuredLink");

const featuredCard = document.getElementById("featuredCard");
const dragArea = document.getElementById("dragArea");

const { pointer, inertia } = window.popmotion;

let currentX = 0;
let currentY = 0;
let dragMove = null;

searchBtn.addEventListener("click", function () {
  const keyword = searchInput.value.trim();
  if (keyword !== "") {
    fetchArt(keyword);
  }
});

async function fetchArt(keyword) {
  statusText.textContent = "Status: Loading...";
//Fetching data from the API
  try {
    const searchUrl = `https://collectionapi.metmuseum.org/public/collection/v1/search?hasImages=true&q=${encodeURIComponent(keyword)}`;
    const searchResponse = await fetch(searchUrl);
    const searchData = await searchResponse.json();

    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      resultsDiv.innerHTML = "<p>No results found.</p>";
      statusText.textContent = "Status: No results found";
      return;
    }

    const ids = searchData.objectIDs.slice(0, 8);

    let artworks = [];

    for (let i = 0; i < ids.length; i++) {
      const objectResponse = await fetch(`https://collectionapi.metmuseum.org/public/collection/v1/objects/${ids[i]}`);
      const objectData = await objectResponse.json();

      if (objectData.primaryImageSmall) {
        artworks.push(objectData);
      }
    }

    if (artworks.length === 0) {
      resultsDiv.innerHTML = "<p>No images found for this search.</p>";
      statusText.textContent = "Status: No image results";
      return;
    }

    showFeatured(artworks[0]);
    showResults(artworks);
    statusText.textContent = "Status: Loaded successfully";

  } catch (error) {
    console.log(error);
    resultsDiv.innerHTML = "<p>Something went wrong.</p>";
    statusText.textContent = "Status: Error loading data";
  }
}

function showFeatured(art) {
  featuredImage.src = art.primaryImageSmall;
  featuredTitle.textContent = art.title || "No title";
  featuredArtist.textContent = art.artistDisplayName || "Unknown artist";
  featuredDate.textContent = art.objectDate || "No date";
  featuredLink.href = art.objectURL || "#";

  currentX = 0;
  currentY = 0;
  featuredCard.style.transform = "translate(0px, 0px)";
}

function showResults(artworks) {
  resultsDiv.innerHTML = "";

  for (let i = 0; i < artworks.length; i++) {
    const art = artworks[i];

    const card = document.createElement("div");
    card.className = "result-card";

    card.innerHTML = `
      <img src="${art.primaryImageSmall}" alt="${art.title}">
      <h3>${art.title || "No title"}</h3>
      <p><strong>Artist:</strong> ${art.artistDisplayName || "Unknown"}</p>
      <p><strong>Date:</strong> ${art.objectDate || "Unknown"}</p>
      <a href="${art.objectURL}" target="_blank">Open</a>
    `;

    resultsDiv.appendChild(card);
  }
}

function setCardPosition(x, y) {
  currentX = x;
  currentY = y;
  featuredCard.style.transform = `translate(${x}px, ${y}px)`;
}

function getBounds() {
  const areaRect = dragArea.getBoundingClientRect();
  const cardRect = featuredCard.getBoundingClientRect();

  return {
    minX: 0,
    minY: 0,
    maxX: areaRect.width - cardRect.width - 20,
    maxY: areaRect.height - cardRect.height - 20
  };
}

featuredCard.addEventListener("mousedown", startDrag);
featuredCard.addEventListener("touchstart", startDrag, { passive: false });

function startDrag(e) {
  e.preventDefault();

  if (dragMove) {
    dragMove.stop();
  }

  const startPoint = getPoint(e);
  const startX = currentX;
  const startY = currentY;

  let lastX = startPoint.x;
  let lastY = startPoint.y;
  let velocityX = 0;
  let velocityY = 0;
  let lastTime = Date.now();

  dragMove = pointer().start(function (point) {
    const newX = startX + (point.x - startPoint.x);
    const newY = startY + (point.y - startPoint.y);

    setCardPosition(newX, newY);

    const now = Date.now();
    const dt = now - lastTime || 1;

    velocityX = ((point.x - lastX) / dt) * 16;
    velocityY = ((point.y - lastY) / dt) * 16;

    lastX = point.x;
    lastY = point.y;
    lastTime = now;
  });

  function endDrag() {
    if (dragMove) {
      dragMove.stop();
    }

    const bounds = getBounds();

    inertia({
      from: currentX,
      velocity: velocityX,
      min: bounds.minX,
      max: bounds.maxX
    }).start(function (v) {
      currentX = v;
      featuredCard.style.transform = `translate(${currentX}px, ${currentY}px)`;
    });

    inertia({
      from: currentY,
      velocity: velocityY,
      min: bounds.minY,
      max: bounds.maxY
    }).start(function (v) {
      currentY = v;
      featuredCard.style.transform = `translate(${currentX}px, ${currentY}px)`;
    });

    document.removeEventListener("mouseup", endDrag);
    document.removeEventListener("touchend", endDrag);
  }

  document.addEventListener("mouseup", endDrag);
  document.addEventListener("touchend", endDrag);
}

function getPoint(e) {
  if (e.touches && e.touches.length > 0) {
    return {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY
    };
  }

  return {
    x: e.clientX,
    y: e.clientY
  };
}

fetchArt("samurai");
