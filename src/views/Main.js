var m = require("mithril")
var TagStream = require("../models/TagStream")

var Media = {
    view: function(vnode) {
        media = vnode.attrs.media
        display = vnode.attrs.media_display ? "block" : "none"
        return m(".media-item[style='display:"+display+"']", m("a.u-photo[style='background-image: url("+media.url+")'][target='_blank'][rel='noopener'][href='"+media.url+"']"))
    }
}

var Attachment = {
    media_display: false,
    oninit: function(vnode) {
        this.media_display = !vnode.attrs.sensitive
    },
    show: function() {
        this.media_display = true
        return false
    },
    view: function(vnode) {
        media_attachments = vnode.attrs.media_attachments
        sensitive = vnode.attrs.sensitive
        return media_attachments.length > 0 ? m(".status__attachments__inner", [
            media_attachments.map(function(media) {
                return m(Media, {media: media, media_display: this.media_display})
            }.bind(this)),
            (this.media_display ? "" : m(".media-item.media_spoiler", {onclick: this.show.bind(this)},m("a.u-photo[style='background-image: url(./spoiler.png)'][target='_blank'][rel='noopener'][href='#']")))
        ]) : ""
    }
}

var Content = {
    show_flg: false,
    oninit: function(vnode) {
        this.show_flg = vnode.attrs.spoiler_text.length == 0
    },
    click: function() {
        this.show_flg = !(this.show_flg)
        return false
    },
    emoji: function(text, emojis) {
        emojis.map(function(emoji) {
            text = text.replace(new RegExp(":"+emoji.shortcode+":", "g"), "<img draggable='false' class='emojione' alt=':"+emoji.shortcode+":' title=':"+emoji.shortcode+":' src='"+emoji.url+"'>")
        })
        return text
    },
    view: function(vnode) {
        spoiler_text = vnode.attrs.spoiler_text
        content = vnode.attrs.content
        emojis = vnode.attrs.emojis
        return m(".status_content.p-name.emojify", [
            (spoiler_text.length>0 ?
                m("p",
                    m("span.p-summary", [
                        m.trust(twemoji.parse(Content.emoji(spoiler_text, emojis))),
                        m("a.status__content__spoiler-link[href='#']", {onclick: this.click.bind(this)}, this.show_flg ? "隠す" : "もっと見る")
                    ])
                )
            : ""),
            m(".e-content"+(this.show_flg?"":"[style='display:none']"), m("p", m.trust(twemoji.parse(Content.emoji(content, emojis)))))
        ])
    }
}

var Main = {
    oninit: function() {
        TagStream.load()
    },
    oncreate: function() {
        TagStream.reset()
        TagStream.check()
    },
    date: function(date) {return (new Date(date)).toLocaleString()},
    more: function() {TagStream.more()},
    add_input: function(event) {
        TagStream.add({domain: "", tag: event.target.previousSibling.value})
    },
    del_input: function(event) {
        id = event.target.parentNode.id.replace("tag-", "")
        TagStream.delete(id)
    },
    enter: function(event) {
        if (event.key == 'Enter') {
            TagStream.reset()
        }
    },
    share: function(event) {
        domain = event.target.parentNode.parentNode.children[0].value
        tag = event.target.parentNode.parentNode.children[1].value
        if (domain !="" && tag != "") {
            window.open('https://'+domain+'/share?text='+encodeURIComponent("\n#"+tag),'hashtag_timeline_viewer_share_window','width=400,height=400');
        }
    },
    view: function() {
        return m(".tag_stream", [
            m(".loading.hidden", m("img[src='./loading.gif']")),
            m(".main-contents", [
                m(".left", [
                    m(".tag-list", TagStream.list.map(function(tag, index) {
                        return m(".tag#tag-"+index, [
                            m("input", {onkeyup: this.enter.bind(tag), oninput: m.withAttr("value", function(value) {tag.domain = value}), value: tag.domain}),
                            "#",
                            m("input", {onkeyup: this.enter.bind(tag), oninput: m.withAttr("value", function(value) {tag.tag = value}), value: tag.tag}),
                            m("a.share[href='#']", {onclick: this.share}, m("img[src='./mstdn.png']")),
                            m("button", {onclick: this.add_input}, "+"),
                            m("button", {onclick: this.del_input}, "-")
                        ])
                    }.bind(this)))
                ]),
                m(".right",[
                    m(".list", TagStream.tag_stream.map(function(status) {
                        return m(".activity-stream.activity-stream-headless.h-entry", [
                            m(".entry.entry-center", 
                                m(".detailed-status.light", [
                                    m("a.detailed-status__display-name.p-author.h-card[href='"+status.account.url+"'][target='_blank'][rel='noopener']", [
                                        m(".avatar", m("img.u-photo[alt=''][src='"+status.account.avatar+"'][width=48][height=48]")),
                                        m("span.display-name", [
                                            m("strong.p^name.emojify", m.trust(twemoji.parse(status.account.display_name!=''?status.account.display_name:status.account.username))),
                                            m("span", "@"+status.account.acct+(status.account.acct.match(/@/)?"":"@"+status.domain))
                                        ])
                                    ]),
                                    m(Content, {spoiler_text: status.spoiler_text, content: status.content, emojis: status.emojis}),
                                    m(Attachment, {media_attachments: status.media_attachments, sensitive: status.sensitive}),
                                    m(".detailed-status__meta", [
                                        m("data.dt-published", {value: Main.date(status.created_at)}),
                                        m("a.detailed-status__datetime.u-url.u-uid[rel='noopener'][target='_blank'][href='"+status.url+"']", 
                                            m("time.formatted[datetime='"+status.created_at+"'][title='"+Main.date(status.created_at)+"']", Main.date(status.created_at))
                                        ),
                                        "·",
                                        m("span", [
                                            m("i.fa fa-retweet"),
                                            m("span", status.reblogs_count+" Reb")
                                        ]),
                                        "·",
                                        m("span", [
                                            m("i.fa fa-star"),
                                            m("span", status.favourites_count+" Fab")
                                        ]),
                                        "·",
                                        m("a.open-in-web-link[target='_blank'][href='"+status.url+"']", "Webで開く")
                                    ])
                                ])
                            ),
                            m("hr")
                        ])
                    })),
                    m("button.more", {onclick: this.more}, "more")
                ])
            ])
        ])
    }
}

module.exports = Main