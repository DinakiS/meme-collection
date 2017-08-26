const ipcRenderer = require('electron').ipcRenrerer,
      clipboard = require('clipboard'),
      i18n = require('i18next'),
      jqueryI18next = require('jquery-i18next'),
      config = require(__dirname + '/config.json');

const NeDB = require('nedb'),
      db = new NeDB({ filename: __dirname + '/memes.db', autoload: true, timestampData: true })

let memeList = $('#meme-list'),
    dropZone = document.getElementById('dropZone'),
    searchTimeout = null,
    dropTimeout = null;

i18n.init({
    lng: 'ru',
    debug: true,
    resources: {
        ru: {
            translation: require(__dirname + '/locales/ru/translation.json')
        }
    }
})

jqueryI18next.init(i18n, $, {
    tName: 't',
    i18nName: 'i18n',
    selectorAttr: 'data-i18n'
})

$(function() {
    new clipboard('.btn');
    $('body').localize()
    
    db.find({}).sort({createdAt: -1}).exec((err, doc) => {
        if (err) throw new Error(err);
        doc.forEach(meme => $('#tmpl-meme').tmpl(meme).appendTo(memeList));
        memesCount();
    })
    
    $(document).on('click', '.meme-delete', function() {
        const _id = $(this).parents('.meme').data('id'),
              that = $(this).parents('.meme');
        db.remove({_id: _id}, {}, function(err, numRemoved) {
            if (err) throw new Error(err);
            
            if (numRemoved !== 0) {
                $(that).remove();
            }
            memesCount();
        })
    })
    $(document).on('click', '.meme-edit', function() {
        const _id = $(this).parents('.meme').data('id');
        
        db.findOne({_id: _id}, function(err, doc) {
            if (err) throw new Error(err);
            
            if (doc) {
                $('#modal-edit').modal('show');
                $('#edit-meme-img').attr('src', doc.url);
                $('#edit-meme-url').val(doc.url);
                $('#edit-meme-tags').val(doc.tags.join(', '));
                $('#edit-meme-btn').data('id', _id);
            }
        })
    })
    $(document).on('click', '.card-img-top', function() {
        let url = $(this).attr('src');
        $("#big-meme-img").attr('src', url);
        $('#modal-meme-img').modal('show');
    })
    $(document).on('click', '#edit-meme-btn', function() {
        let url = $('#edit-meme-url').val(),
            tagsText = $('#edit-meme-tags').val(),
            _id = $('#edit-meme-btn').data('id');
        
        if (url.length > 5) {
            let tags = [];
            if (tagsText.length !== 0) {
                tags = tagsText.split(',').map(tag => tag.trim());
            }
            
            db.update({ _id: _id }, {
                url: url,
                tags: tags
            }, { returnUpdatedDocs: true }, function(err, numAffected, affectedDoc) {
                if (err) throw new Error(err);
                
                if (affectedDoc && affectedDoc._id) {
                    $(`[data-id="${affectedDoc._id}"]`).replaceWith($('#tmpl-meme').tmpl(affectedDoc));
                }
                $('#modal-edit').modal('hide');
            })
        }
    })
    $(document).on('click', '#add-meme-btn', function() {
        let url = $('#add-meme-url').val(),
            tagsText = $('#add-meme-tags').val();
        
        if (url.length > 5) {
            let tags = [];
            if (tagsText.length !== 0) {
                tags = tagsText.split(',').map(tag => tag.trim());
            }
            
            db.insert({
                url: url,
                tags: tags
            }, function(err, newDoc) {
                if (err) throw new Error(err);
                
                if (newDoc) $('#tmpl-meme').tmpl(newDoc).prependTo(memeList);
                
                $('#modal-add').modal('hide');
            })
        }
        memesCount();
    })
    
    $(document).on('keyup', '#search', function() {
        if (searchTimeout) clearTimeout(searchTimeout);
        
        let search = $(this).val().trim();
        
        searchTimeout = setTimeout(function() {
            $(memeList).empty();
            if (search.length == 0) {
                db.find({}).sort({createdAt: -1}).exec((err, doc) => {
                    if (err) throw new Error(err);
                    doc.forEach(meme => $('#tmpl-meme').tmpl(meme).appendTo(memeList))
                })
                clearTimeout(searchTimeout);

            } else {
                let searchRegEx = new RegExp(`(?:${search.split(', ').join('|')})`, 'gi');
                db.find({ $or : [{ tags: { $elemMatch: searchRegEx } }, {url: searchRegEx }]}).sort({ createdAt: -1 }).exec((err, docs) => {
                    if (err) throw new Error(err);
                    docs.forEach(meme => $('#tmpl-meme').tmpl(meme).appendTo(memeList))
                })
            }
            clearTimeout(searchTimeout);
        }, config.searchTimeout);
    })
    
    $(document).on('click', '.meme .tags .badge', function(event) {
        let text = $(this).text();
        $('#search').val(text);
        $('#search').trigger('keyup');
    })
    
    function memesCount(query = {}) {
        db.count(query, function(err, count) {
            $('#memes-count').text(count);
        })
    }
    
    // === Check for dublicates ===
    $(document).on('change', '#add-meme-url', function(event) {
        let url = $(this).val();
        
        $('#add-meme-img').attr('src', url);
        
        checkDublicatesByURL(url, function(isDub) {
            if (isDub) {
                $.notify({
                    title: i18n.t('This meme is already in the base!<br>'),
                    message: `<img src="${isDub.url}" style="width: 200px;">`
                }, {
                    type: "danger",
                    z_index: 5000,
                    delay: 0
                })
            }
        })
    })
    function checkDublicatesByURL(url, callback) {
        if (!url) return callback(null);
        
        db.findOne({ url: url }, function(err, doc) {
            if (err) throw new Error(err);
            
            if (doc) {
                callback(doc)
            } else {
                callback(false)
            }
        })
    }
    
    // ====== Drag-N-Drop ======
    document.ondragover = (ev) => {
        ev.preventDefault();
        dropZone.style.visibility = 'visible';
        clearTimeout(dropTimeout);
    }
    dropZone.ondragleave = (ev) => {
        dropTimeout = setTimeout(function() {
            dropZone.style.visibility = 'hidden';
        }, 100)
        //ev.preventDefault();
    }
    dropZone.ondrop = (ev) => {
        console.log('Drop');
        ev.preventDefault();
        
        if (event.dataTransfer.files.length !== 0) {
            let file = event.dataTransfer.files[0];
            
            
        } else {
            let data = event.dataTransfer.items;
            if (data[0].kind == 'string' && data[0].type.match('^text/plain')) {
                data[0].getAsString(function(url) {
                    $('#add-meme-url').val(url);
                    $('#modal-add').modal('show');
                    $('#add-meme-url').trigger('change');
                })
            }
        }
        
        dropZone.style.visibility = 'hidden';
    }
    function drop_handler(ev) {
        console.log("Drop");
        ev.preventDefault();
        var data = event.dataTransfer.items;
        for (var i = 0; i < data.length; i += 1) {
            if ((data[i].kind == 'string') &&
                (data[i].type.match('^text/plain'))) {
                // This item is the target node
                data[i].getAsString(function (s) {
                    ev.target.textContent = s;
                });
            } else if ((data[i].kind == 'string') &&
                (data[i].type.match('^text/html'))) {
                // Drag data item is HTML
                console.log("... Drop: HTML");
            } else if ((data[i].kind == 'string') &&
                (data[i].type.match('^text/uri-list'))) {
                // Drag data item is URI
                console.log("... Drop: URI");
            } else if ((data[i].kind == 'file') &&
                (data[i].type.match('^image/'))) {
                // Drag data item is an image file
                var f = data[i].getAsFile();
                console.log("... Drop: File ");
            }
        }
    }
})