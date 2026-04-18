const MET_SEARCH_URL = "https://collectionapi.metmuseum.org/public/collection/v1/search";
const MET_OBJECT_URL = "https://collectionapi.metmuseum.org/public/collection/v1/objects";

const form = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const searchBtn = document.getElementById("searchBtn");
const hasImagesOnly = document.getElementById("hasImagesOnly");
const limitSelect = document.getElementById("limitSelect");

const statusText = document.getElementById("statusText");
const resultsSummary = document.getElementById("resultsSummary");
const resultsGrid = document.getElementById("resultsGrid");
const loadingState = document.getElementById("loadingState");
const emptyState = document.getElementById("emptyState");

const featuredCard = document.getElementById("featuredCard");
const dragBounds = document.getElementById("dragBounds");
const featuredImage = document.getElementById("featuredImage");
const featuredDepartment = document.getElementById("featuredDepartment");
const featuredDate = document.getElementById("featuredDate");
const featuredTitle = document.getElementById("featuredTitle");
const featuredArtist = document.getElementById("featuredArtist");
const featuredCulture = document.getElementById("featuredCulture");
const featuredMedium = document.getElementById("featuredMedium");
const featuredLink = document.getElementById("featuredLink");

const {
  pointer,
  inertia,
  value
} = window.popmotion;

let artworks = [];
let currentX = 0;
let currentY = 0;
let dragSession = null;
let xMotionStop = null;
let yMotionStop = null;

function setStatus(message) {
  statusText.textContent = message;
}

function showLoading(isLoading) {
  loadingState.classList.toggle("hidden", !isLoading);
}

function showEmpty(isEmpty) {
  emptyState.classList.toggle("hidden", !isEmpty);
}

function resetResults() {
  resultsGrid.innerHTML = "";
  resultsSummary.textContent = "No results loaded yet.";
}

function clamp(valueToClamp, min, max) {
  return Math.min(Math.max(valueToClamp, min), max);
}

function getCardBounds() {
  const boundsRect = dragBounds.getBoundingClientRect();
  const cardRect = featuredCard.getBoundingClientRect();

  const maxX = Math.max(0, boundsRect.width - cardRect.width - 18);
  const maxY = Math.max(0, boundsRect.height - cardRect.height - 18);

  return {
    minX: 0,
    minY: 0,
    maxX,
    maxY
  };
}

function applyCardTransform(x, y) {
  currentX = x;
  currentY = y;
  featuredCard.style.transform = `translate3d(${x}px, ${y}px, 0)`;
}

function stopMotion() {
  if (typeof xMotionStop === "function") {
    xMotionStop();
    xMotionStop = null;
  }

  if (typeof yMotionStop === "function") {
    yMotionStop();
    yMotionStop = null;
  }
}

function animateToBounds(velocityX = 0, velocityY = 0) {
  stopMotion();

  const bounds = getCardBounds();
  const startX = clamp(currentX, bounds.minX, bounds.maxX);
  const startY = clamp(currentY, bounds.minY, bounds.maxY);

  xMotionStop = inertia({
    from: startX,
    velocity: velocityX,
    min: bounds.minX,
    max: bounds.maxX,
    bounceStiffness: 160,
    bounceDamping: 12
  }).start((x) => {
    currentX = x;
    featuredCard.style.transform = `translate3d(${x}px, ${currentY}px, 0)`;
  });

  yMotionStop = inertia({
    from: startY,
    velocity: velocityY,
    min: bounds.minY,
    max: bounds.maxY,
    bounceStiffness: 160,
    bounceDamping: 12
  }).start((y) => {
    currentY = y;
    featuredCard.style.transform = `translate3d(${currentX}px, ${y}px, 0)`;
  });
}

function initDrag() {
  let startPointerX = 0;
  let startPointerY = 0;
  let startCardX = 0;
  let startCardY = 0;
  let prevMoveTime = 0;
  let prevPointerX = 0;
  let prevPointerY = 0;
  let lastVelocityX = 0;
  let lastVelocityY = 0;

  const endDrag = () => {
    if (dragSession && typeof dragSession.stop === "function") {
      dragSession.stop();
      dragSession = null;
    }

    document.removeEventListener("mouseup", endDrag);
    document.removeEventListener("touchend", endDrag);

    animateToBounds(lastVelocityX, lastVelocityY);
  };

  const startDrag = (event) => {
    event.preventDefault();
    stopMotion();

    const point = getPointerPoint(event);
    startPointerX = point.x;
    startPointerY = point.y;
    startCardX = currentX;
    startCardY = currentY;

    prevMoveTime = performance.now();
    prevPointerX = point.x;
    prevPointerY = point.y;
    lastVelocityX = 0;
    lastVelocityY = 0;

    dragSession = pointer().start((latest) => {
      const now = performance.now();
      const nextX = startCardX + (latest.x - startPointerX);
      const nextY = startCardY + (latest.y - startPointerY);

      const bounds = getCardBounds();
      const clampedX = clamp(nextX, bounds.minX - 40, bounds.maxX + 40);
      const clampedY = clamp(nextY, bounds.minY - 40, bounds.maxY + 40);

      applyCardTransform(clampedX, clampedY);

      const dt = Math.max(now - prevMoveTime, 1);
      lastVelocityX = ((latest.x - prevPointerX) / dt) * 16;
      lastVelocityY = ((latest.y - prevPointerY) / dt) * 16;

      prevMoveTime = now;
      prevPointerX = latest.x;
      prevPointerY = latest.y;
    });

    document.addEventListener("mouseup", endDrag, { once: true });
    document.addEventListener("touchend", endDrag, { once: true });
  };

  featuredCard.addEventListener("mousedown", startDrag);
  featuredCard.addEventListener("touchstart", startDrag, { passive: false });
}

function getPointerPoint(event) {
  if (event.touches && event.touches.length > 0) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }

  return {
    x: event.clientX,
    y: event.clientY
  };
}

function normalizeArtwork(art) {
  return {
    id: art.objectID,
    title: art.title || "Untitled",
    artist: art.artistDisplayName || "Unknown artist",
    date: art.objectDate || "Unknown date",
    department: art.department || "Unknown department",
    culture: art.culture || art.period || "Culture/period unavailable",
    medium: art.medium || "Medium unavailable",
    image: art.primaryImageSmall || art.primaryImage || "",
    objectURL: art.objectURL || `https://www.metmuseum.org/art/collection/search/${art.objectID}`
  };
}

async function searchArtwork(query, imageOnly) {
  const url = new URL(MET_SEARCH_URL);
  url.searchParams.set("q", query);

  if (imageOnly) {
    url.searchParams.set("hasImages", "true");
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to search the Met API.");
  }

  return response.json();
}

async function fetchObjectById(id) {
  const response = await fetch(`${MET_OBJECT_URL}/${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch object ${id}.`);
  }

  return response.json();
}

async function loadArtworks(query) {
  const limit = Number(limitSelect.value);
  setStatus(`Searching for “${query}”...`);
  showLoading(true);
  showEmpty(false);
  resetResults();

  try {
    const searchData = await searchArtwork(query, hasImagesOnly.checked);

    if (!searchData.objectIDs || searchData.objectIDs.length === 0) {
      artworks = [];
      showEmpty(true);
      setStatus("No artworks found.");
      resultsSummary.textContent = `0 results for "${query}"`;
      return;
    }

    const ids = searchData.objectIDs.slice(0, limit * 3);
    const rawObjects = await Promise.allSettled(ids.map(fetchObjectById));

    artworks = rawObjects
      .filter((item) => item.status === "fulfilled")
      .map((item) => normalizeArtwork(item.value))
      .filter((art) => art.image)
      .slice(0, limit);

    if (artworks.length === 0) {
      showEmpty(true);
      setStatus("Results were found, but none had displayable images.");
      resultsSummary.textContent = `0 image-ready results for "${query}"`;
      return;
    }

    renderFeaturedArtwork(artworks[0]);
    renderResults(artworks);
    resultsSummary.textContent = `${artworks.length} result${artworks.length > 1 ? "s" : ""} for "${query}"`;
    setStatus(`Loaded ${artworks.length} artworks for "${query}".`);
  } catch (error) {
    console.error(error);
    showEmpty(true);
    emptyState.innerHTML = `
      <h4>Something went wrong</h4>
      <p>Please try again in a moment.</p>
    `;
    setStatus("Error loading artwork.");
    resultsSummary.textContent = "An error occurred.";
  } finally {
    showLoading(false);
  }
}

function renderFeaturedArtwork(art) {
  featuredImage.src = art.image || "";
  featuredImage.alt = art.title;
  featuredDepartment.textContent = art.department;
  featuredDate.textContent = art.date;
  featuredTitle.textContent = art.title;
  featuredArtist.textContent = art.artist;
  featuredCulture.textContent = art.culture;
  featuredMedium.textContent = art.medium;
  featuredLink.href = art.objectURL;

  applyCardTransform(0, 0);
  stopMotion();
}

function renderResults(items) {
  resultsGrid.innerHTML = items
    .map(
      (art) => `
        <article class="result-card">
          <div class="result-image">
            <img src="${art.image}" alt="${escapeHtml(art.title)}" loading="lazy" />
          </div>
          <div class="result-body">
            <div class="result-meta">
              <span class="tag">${escapeHtml(art.department)}</span>
              <span class="tag soft">${escapeHtml(art.date)}</span>
            </div>
            <h4>${escapeHtml(art.title)}</h4>
            <p><strong>${escapeHtml(art.artist)}</strong></p>
            <p>${escapeHtml(art.medium)}</p>
            <a
              class="result-btn"
              href="${art.objectURL}"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open artwork
            </a>
          </div>
        </article>
      `
    )
    .join("");
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();

  if (!query) {
    setStatus("Please enter a search term.");
    return;
  }

  await loadArtworks(query);
});

window.addEventListener("resize", () => {
  const bounds = getCardBounds();
  applyCardTransform(
    clamp(currentX, bounds.minX, bounds.maxX),
    clamp(currentY, bounds.minY, bounds.maxY)
  );
});

initDrag();
loadArtworks(searchInput.value.trim());
