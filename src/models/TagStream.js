var m = require("mithril")

var TagStream = {
    list: [],
    tag_stream: [],

    save: function() {
        domains = []
        tags = []
        TagStream.list.map(function(tag) {
            domains.push(tag.domain)
            tags.push(tag.tag)
        })
        localStorage.setItem("domains", domains);
        localStorage.setItem("tags", tags);
    },
    load: function() {
        TagStream.list = []
        domains = localStorage.getItem('domains') ?  localStorage.getItem('domains').split(",") : ['biwakodon.com']
        tags = localStorage.getItem('tags') ?  localStorage.getItem('tags').split(',') : ['biwakomap']
        domains.map(function(domain, index) {
            TagStream.add({domain: domain, tag: tags[index]})
        })
    },
    _add_url_list: function(url_list, stream, status) {
        if (url_list.indexOf(status.url)==-1) {
            stream.push(status)
            url_list.push(status.url)
        }
    },
    _make_stream: function(stream, domain) {
        stream.map(function(timeline) {
            var tag_stream_index = 0
            var new_tag_stream = []
            var url_list = []
            timeline.map(function(status) {
                status.domain = domain
                while(TagStream.tag_stream[tag_stream_index] && TagStream.tag_stream[tag_stream_index].created_at > status.created_at) {
                    TagStream._add_url_list(url_list, new_tag_stream, TagStream.tag_stream[tag_stream_index])
                    tag_stream_index+=1
                }
                TagStream._add_url_list(url_list, new_tag_stream, status)
            })
            while(TagStream.tag_stream[tag_stream_index]) {
                TagStream._add_url_list(url_list, new_tag_stream, TagStream.tag_stream[tag_stream_index])
                tag_stream_index+=1
            }

            TagStream.tag_stream = new_tag_stream
        })
    },
    reset: function() {
        TagStream.list.map(function(tag) {
            tag.max_id = null
        })
        TagStream.tag_stream = []
        TagStream.get({})
        TagStream.save()
    },
    get: function(flg) {
        var done = 0
        var stream = []

        !flg.since ? document.querySelector(".loading").classList.remove("hidden") : null

        var valid_cnt = 0
        TagStream.list.map(function(tag) {
            if (tag.domain!="" && tag.tag!="") {
                valid_cnt++
            }
        })
        TagStream.list.map(function(tag) {
            if (tag.domain!="" && tag.tag!="") {
                m.request({
                    method: "GET",
                    url: "https://"+tag.domain+"/api/v1/timelines/tag/"+tag.tag+"?"+(flg.max && tag.max_id ? "max_id="+tag.max_id : "")+(flg.since && tag.since_id ? "since_id="+tag.since_id : ""),
                }).then(function(result) {
                    if (result.length > 0) {
                        stream.push(result)
                        tag.max_id = result[result.length -1].id
                        if (tag.since_id < result[0].id) {
                            tag.since_id = result[0].id
                        }
                    }

                    done++
                    if (done == valid_cnt) {
                        document.querySelector(".loading").classList.add("hidden")
                        TagStream._make_stream(stream, tag.domain)
                    }
                }).catch(function(e) {
                    console.log(e.message)

                    done++
                    if (done == valid_cnt) {
                        document.querySelector(".loading").classList.add("hidden")
                        TagStream._make_stream(stream, tag.domain)
                    }
                })
            }
        })
    },
    add: function(tag) {
        var tag_timeline = {}
        tag_timeline.domain = tag.domain
        tag_timeline.tag = tag.tag
        tag_timeline.max_id = null
        tag_timeline.since_id = null
        TagStream.list = TagStream.list.concat(tag_timeline)        
    },
    delete: function(id) {
        num = Number(id)
        if (TagStream.list.length > num && TagStream.list.length > 1) {
            TagStream.list.splice(id, 1)
            TagStream.reset()
        }
    },
    more: function() {
        TagStream.get({max: true})
    },
    check: function() {
        setInterval(function() {
            TagStream.get({since: true})
        }, 10000)
    }
}

module.exports = TagStream