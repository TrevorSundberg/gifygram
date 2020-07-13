let lastHash = "";

const onHashChange = () => {
  const savedHash = location.hash;
  const element = document.getElementById(savedHash.slice(1));
  if (!element) {
    return;
  }

  lastHash = savedHash;

  console.log("Begin scrolling to dynamic element", savedHash);
  setTimeout(() => {
    element.scrollIntoView();
    console.log("End scrolling to dynamic element", savedHash);
  }, 200);
};

setInterval(() => {
  if (location.hash !== lastHash) {
    onHashChange();
  }
}, 200);
