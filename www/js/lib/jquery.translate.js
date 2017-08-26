/**
 * @file jquery.translate.js
 * @brief jQuery plugin to translate text in the client side.
 * @author Manuel Fernandes
 * @site
 * @version 0.9
 * @license MIT license <http://www.opensource.org/licenses/MIT>
 *
 * translate.js is a jQuery plugin to translate text in the client side.
 *
 * Edited by Dinaki
 */

(function ($) {
    $.fn.translate = function (options) {

        var that = this; //a reference to ourselves

        var settings = {
            dataKey: "i18n",
            lang: "en"
        };
        settings = $.extend(settings, options || {});
        
        if (settings.dataKey.indexOf('[data-') == -1)
            settings.dataKey = "[data-" + settings.dataKey + "]";

        var t = settings.t;

        //public methods
        this.lang = function (l) {
            if (l) {
                settings.lang = l;
                this.translate(settings); //translate everything
            }

            return settings.lang;
        };


        this.get = function (index) {
            var res = index;

            try {
                res = t[settings.lang][index];
            } catch (err) {
                //not found, return index
                return null;
            }

            if (res)
                return res;
            else
                return index;
        };

        this.g = this.get;



        //main
        this.find(settings.dataKey).each(function (i) {
            var $this = $(this);

            var trn_key = $this.attr("data-i18n"),
                attr = undefined;
            if (trn_key[0] == '[') {
                attr = /^\[(.*?)\]/.exec(trn_key)[1];
                trn_key = /^\[.*?\](.*?)$/.exec(trn_key)[1];
            }
            var translation = that.get(trn_key);
            if (translation !== null) {
                if (attr) {
                    $this.attr(attr, translation);
                } else {
                    $this.html(translation);
                }
            }
        });
        return this;
    };
})(jQuery);
