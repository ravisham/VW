import $ from 'jquery';

$(() => {
  $('.filters__filter-label').on('click', function () {
    $('.filters__filter--active .filters__filter-content').slideUp(400);

    if (!$(this).parent().hasClass('filters__filter--active')) {
      $('.filters__filter').removeClass('filters__filter--active');
      $(this).next().slideDown(400);
      $(this).parent().addClass('filters__filter--active');
    } else {
      $(this).next().slideUp(400);
      $(this).parent().removeClass('filters__filter--active');
    }
  });
  $('.fields__group-label').on('click', function () {
    $('.fields__group--active .fields__group-content').slideUp(400);

    if (!$(this).parent().hasClass('fields__group--active')) {
      $('.fields__group').removeClass('fields__group--active');
      $(this).next().slideDown(400);
      $(this).parent().addClass('fields__group--active');
    } else {
      $(this).next().slideUp(400);
      $(this).parent().removeClass('fields__group--active');
    }
  });
});
