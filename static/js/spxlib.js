

// a test function
function test() {
    console.log('Hello from spxlib.js');
}


function spxInit() {
    // executes on page load:
    // - load values from localStorage
    // - init Sortable
    console.log('%c  SPX Graphics Controller (c) 2020- SPX Graphics  ', 'border-radius: 200px; font-size: 1.1em; padding: 0.4em; background: #0e7a27; color: #fff');


    // Init sortable and saveData onEnd
    if ( ife('identifier').value=="controller" ) {
        sortable = Sortable.create(itemList, {
            handle: '.handle',
            animation: 150,
            disabled: false,
            ghostClass: "sortable-ghost",
            chosenClass: "sortable-chosen",
            // dragClass: "sortable-drag",
            // sortable.option("disabled", true); // TAI false
            // onStart: function (evt) {
            //     console.log('Start Ctrl? = ', evt.originalEvent.ctrlKey)
            // },
            onMove: function (evt) {
                console.log('Move Ctrl? = ', evt.originalEvent.ctrlKey)
                if (evt.originalEvent.ctrlKey) {
                    evt.dragged.classList.add('child-item');
                } else {
                    evt.dragged.classList.remove('child-item');
                }
                console.log('Hovering over ', evt.related.getAttribute('data-spx-epoch'));
            },
            onEnd: function (evt) {
                console.log('Dropped over ', evt.item.getAttribute('data-spx-epoch'));
                SaveNewSortOrder();
                // console.log('End Ctrl? = ', evt.originalEvent.ctrlKey)
            },
        });
    }

    focusRow(0);
    AppState("DEFAULT");
    spx_system('CHECKCONNECTIONS');
    document.getElementById('itemList').style.opacity=1;

} // end spxInit