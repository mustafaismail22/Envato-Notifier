function login() {
    initOptions();
    return EnvatoNotifier.auth().setAuth();
}

function logout(){
    EnvatoNotifier.auth().deleteAuth();
}

function initOptions() {
    localStorage["salesNotification"] = "true";
    localStorage["commentNotification"] = "true";
    localStorage["autoHideNotification"] = "false";
}

function  getUserInfo() {
    var dfd = $.Deferred();
    var api = EnvatoNotifier.api();
    var userData = [];

    $.when(
        api.get("market/private/user/account.json","", function(data) {
            $.each(data.account, function(index, val) {
                userData[index] = val;
                localStorage[index] = val;
            });
        }),
        api.get("market/private/user/username.json","", function(data) {
            userData["username"] = data.username;
            localStorage["username"] = data.username;
        })
    ).then(function() {
        dfd.resolve(userData);
    },function(){
        dfd.reject(userData);
    });
    
    return dfd.promise();
}

function getUserItems(username) {
    var dfd = $.Deferred();
    var api = EnvatoNotifier.api();
    var items = [];
    var sites = [];

    api.get("market/user-items-by-site:"+username+".json").then(function (data){
        
        $.each(data["user-items-by-site"], function(index, val) {
            sites.push( val.site );
        });

        var deferreds = [];

        $.each(sites, function(index, site) {
            deferreds.push( api.get("market/new-files-from-user:"+username+","+site+".json", "", function(data) {
                
                $.each(data["new-files-from-user"], function(index, item) {
                    items.push( item );
                });

            }) );
        });

        $.when.apply($, deferreds).then(function () {
            dfd.resolve(items);
        }, function() {
            dfd.reject(items);
        });

    }, function() {
        dfd.reject(items);
    });

    return dfd.promise();
}

function getUserComments(username) {
    var dfd = $.Deferred();
    var comments = [];

    $.ajax({
        url: "http://themeforest.net/feeds/user_item_comments/" + username + ".atom",
        dataType: "xml"
    }).then(function(response) {
        json = $.xml2json(response); // console.log(json);
        $.each( json["#document"].feed.entry , function(index, val) {
            var comment = {};
            comment["id"] = val.id.substr( val.id.lastIndexOf("/") + 1 );
            comment["author"] = val.author.name;
            comment["content"] = val.content["_"].replace(/(<([^>]+)>)/ig, "").replace(/(\r\n|\n|\r)/gm,"");
            comment["item"] = val.title;
            comment["updated"] = val.updated;
            comment["link"] = val.link["$"].href + "/" + comment["id"];
            comments.push(comment);
        });
        // console.log(comments);
        dfd.resolve(comments);
    },function () {
        dfd.resolve(comments);
    });

    return dfd.promise();
}

function getRecentSales() {
    var dfd = $.Deferred();
    var api = EnvatoNotifier.api();
    var sales = [];
    var lastSale = (!!localStorage["lastSale"])? localStorage["lastSale"] : new Date().getTime();

    api.get("market/private/user/recent-sales.json").then(function (data) {
        $.each(data["recent-sales"], function(index, val) {
            var item = {};
            item["item"] = val.item;
            item["amount"] = val.amount;
            item["sold_at"] = new Date(val.sold_at).getTime();
            item["new_sale"] = false;
            sales.push(item);
        });

        $.map(sales, function(item, index) {
            if (item["sold_at"] >  parseInt(lastSale, 10) ) {
                item["new_sale"] = true;
            }
            return item;
        });

        if (sales[0]) {
            localStorage["lastSale"] = sales[0].sold_at;
        }

         dfd.resolve(sales);
    },function () {
        dfd.reject(sales);
    });

    return dfd.promise();    
}

function commentNotification() {
    var username = localStorage["username"];
    if ( localStorage["commentNotification"] == "true" && username) {
        getUserComments(username).then(function (comments) {  console.log(comments);
            
            var lastCommentId = localStorage["lastCommentId"];
            var newComments = $.grep(comments, function(e){
                return parseInt(e.id , 10) > parseInt(lastCommentId, 10) && e.author != username;
            }); console.log(newComments);

            $.each(newComments, function(index, comment) {
                var title = comment.item.substring(0, 20).split(" ").slice(0, -1).join(" ") + "...";
                var notification = new Notification("New Comment for " + title, {
                    icon: "images/icon128.png",
                    body: comment.content
                });
                notification.onclick = function() {
                    chrome.tabs.create({ url:comment.link });
                }

                if (localStorage["autoHideNotification"] == "true") {
                    setTimeout(function() {
                        notification.close();
                    }, 20000);
                }
            });

            if (comments[0]) {
                localStorage["lastCommentId"] = comments[0].id;
            }

        });
    }
}

function salesNotification () {
    if (localStorage["salesNotification"] == "true" && localStorage["username"]) {
        getRecentSales().then(function(sales) {

            var newSales = $.grep(sales, function(e){
                return e.new_sale == true;
            }); console.log(sales); console.log(newSales);

            $.each(newSales, function(index, item) {
                var notification = new Notification("Hooray! New Sale.", {
                    icon: "images/icon128.png",
                    body: "You just sold " + item.item + " for $" + item.amount
                });
                notification.onclick = function() {
                    chrome.tabs.create({ url: "http://themeforest.net/statement" });
                }
                if (localStorage["autoHideNotification"] == "true") {
                    setTimeout(function() {
                        notification.close();
                    }, 20000);
                }
            });

        });
    }
}

if (window.Notification) {

    commentNotification();
    salesNotification();

    setInterval(function() {
        commentNotification();
        salesNotification();
    },  1000 * 60 * 5 ); // 5 Minutes

}