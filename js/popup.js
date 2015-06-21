$(function() {

  var backgroundPage =  chrome.extension.getBackgroundPage();

  if (EnvatoNotifier.auth().isLoggedIn()) {
    
    $('#login').addClass('hidden');

    var dfd1 = backgroundPage.getRecentSales().then(function(recentSales){
      $.each(recentSales, function(index, val) {
        var $div = $("<div />");
        $div.html('<strong>$'+ val.amount +' </strong> ' + val.item);
        if (val.new_sale) { $div.css('background-color', 'lightyellow'); }
        $("#recent-sales").append($div);
      });
    });

    var dfd2 = backgroundPage.getUserInfo().then(function(data){
      $(".userinfo .earnings").text("$"+data.available_earnings);
      $(".userinfo .username").text(data.firstname + " " + data.surname);
      $(".userinfo img").attr('src',data.image);
    });

    $.when(dfd1 , dfd2).then(function() {
      $('#loading').addClass('hidden');
    },function() {
      window.location.reload();
    });
    

  }else{
    $('#login').removeClass('hidden');
    $('#loading').addClass('hidden');
  }

  $('#login-btn').on('click', function(event) {
    event.preventDefault();
    backgroundPage.login().then(function() {
      window.location.reload();
    });
  });

  $('#logout-btn').on('click', function(event) {
    event.preventDefault();
    backgroundPage.logout();
    window.location.reload();
  });

  $('#settings-btn').on('click', function(event) {
    event.preventDefault();
    $('#settings').removeClass('hidden');
  });

  $('#back-btn').on('click', function(event) {
    event.preventDefault();
    $('#settings').addClass('hidden');
  });

  // Settings
  $('#settings input[type=checkbox]').each(function(i,e) {
    if (localStorage[e.name] == 'true') {
        $(this).attr('checked', true);
    } else if (localStorage[e.name] == 'false') {
        $(this).attr('checked', false);
    }
  });

  $("#settings input[type=checkbox]").on('click', function() {
    localStorage[$(this).attr("name")] = $(this).prop("checked");
  });

  Waves.attach('.btn , .button , .checkbox-default');
  Waves.init();
});