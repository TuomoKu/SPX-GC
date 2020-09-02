window.onload = function () {
  // GET ALL THE PLAYERS - DRAGGABLE AND DROP ZONES
  var draggable = document.getElementById("item0"); // was draggable
  var dropzones = document.getElementsByClassName("dropzone");



  // DRAG START - HIGHLIGHT DROP ZONES WITH CSS CLASS
  //console.log(draggable);
  if (draggable != null) {
    draggable.addEventListener("dragstart", function () {
      for (let i = 0; i < dropzones.length; i++) {
        dropzones[i].classList.add("active");
      }
    });

    // DRAG END - REMOVE ALL ADDED ACTIVE & OVER CSS CLASS
    draggable.addEventListener("dragend", function () {
      for (let i = 0; i < dropzones.length; i++) {
        dropzones[i].classList.remove("active");
        dropzones[i].classList.remove("over");
      }
    });

    // DRAG - AS YOU ARE DRAGGING
    draggable.addEventListener("drag", function () {
      // DO SOMETHING... IF YOU WANT
    });


  }


  for (let i = 0; i < dropzones.length; i++) {
    // DRAG ENTER - HIGHLIGHT THIS ZONE
    dropzones[i].addEventListener("dragenter", function () {
      dropzones[i].classList.add("over");
    });

    // DRAG LEAVE - REMOVE HIGHLIGHT ON THIS ZONE
    dropzones[i].addEventListener("dragleave", function () {
      dropzones[i].classList.remove("over");
    });

    // DRAG OVER - PREVENT THE DEFAULT "DROP", SO WE CAN DO OUR OWN
    dropzones[i].addEventListener("dragover", function (evt) {
      evt.preventDefault();
    });

    // ON DROP - MOVE THE DRAGGABLE ELEMENT
    dropzones[i].addEventListener("drop", function (evt) {
      evt.preventDefault();
      // Will move the draggable element only if dropped into a different box
      if (evt.target != draggable.parentNode && evt.target != draggable) {
        draggable.parentNode.removeChild(draggable);
        evt.target.appendChild(draggable);
      }
    });
  }
};