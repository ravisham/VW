import $ from 'jquery';

const scrollBlockingClass = 'modal--open';
const componentName = 'modal';

function allowScrolling() {
  $('html').removeClass(scrollBlockingClass);
  $(document).off('touchmove.modal');
  $('body').off('touchstart.modal touchmove.modal');
}

function stopTouchMove() {
  // Disable scroll for the document, we'll handle it ourselves
  $(document).on('touchmove.modal', ev => {
    ev.preventDefault();
  });

  // Check if we should allow scrolling up or down
  $('body').on('touchstart.modal', `.${componentName}--wrapper > div`, function (ev) {
    // If the element is scrollable (content overflows), then...
    if (this.scrollHeight !== this.clientHeight) {
      // If we're at the top, scroll down one pixel to allow scrolling up
      if (this.scrollTop === 0) {
        this.scrollTop = 1;
      }
      // If we're at the bottom, scroll up one pixel to allow scrolling down
      if (this.scrollTop === this.scrollHeight - this.clientHeight) {
        this.scrollTop = this.scrollHeight - this.clientHeight - 1;
      }
    }

    // Check if we can scroll
    this.allowUp = this.scrollTop >= 0;
    this.allowDown = this.scrollTop < (this.scrollHeight);
    this.lastY = ev.originalEvent.pageY;
  });

  $('body').on('touchmove.modal', `.${componentName}--wrapper > div`, function (ev) {
    let originalEvent = ev.originalEvent,
      up = originalEvent.pageY > this.lastY,
      down = !up;

    this.lastY = originalEvent.pageY;

    if ((up && this.allowUp) || (down && this.allowDown)) {
      originalEvent.stopPropagation();
    } else {
      originalEvent.preventDefault();
    }
  });
}

function stopScrolling(modal) {
  $('html').addClass(scrollBlockingClass);
  stopTouchMove();
}

function closeModal() {
  $(document).off('click', `.${componentName}`);
  $('body').off('touchstart.modal touchmove.modal');
  $('.modal--active').fadeOut(250, () => {
    allowScrolling();
    $('.modal').removeClass('modal--active');
  });
}

function openModal(modal) {
  $(`#${modal}`).fadeIn(250).addClass('modal--active');

  stopScrolling(modal);

  $(document).on('click', '.modal', ev => {
    if (!$(ev.target).hasClass('modal__container') && !$(ev.target).parents().hasClass('modal__container')) {
      ev.stopPropagation();

      closeModal();
    }
  });
}

$(() => {
  $('a[rel="open:modal"]').on('click', function (ev) {
    let $this = $(this),
      modal = $this.data('modal');

    ev.preventDefault();

    openModal(modal);
  });

  // Remove video player container when modal is closed with close button
  $('.modal__close').on('click', ev => {
    ev.preventDefault();

    closeModal();
  });

  // Remove video player container when modal is closed with esc key
  $(document).on('keyup', ev => {
    if (ev.keyCode === 27) {
      ev.preventDefault();

      closeModal();
    }
  });
});
