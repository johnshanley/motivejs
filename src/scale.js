Motive.Scale = function(name){
    if (!name) {
        console.log('no scale name specified');
        return;
    }
    if (typeof name === 'string') {

        var scale_pattern = /([A-G](?:bb|x|b|#)?)\s(.*)/;

        if (!name.match(scale_pattern)) {
            console.log('scale name was not formatted correctly');
            return;
        }

        var root = name.replace(scale_pattern, '$1');
        var formula = name.replace(scale_pattern, '$2');

        this.root = root;
        this.formula = formula;

        var matched;
        for(var i = 0; i < scales.length; i++){
            if(scales[i].name === formula){
                matched = scales[i];
                break;
            }
        }
        if(matched){
            this.matched = matched;
            var mynotes = getNoteNamesFromIntervalArray(root, matched.intervals);
            var note_members = [];
            for (var i = 0; i < mynotes.length; i++) {
                note_members.push(new Motive.Note(mynotes[i]));
            }
            this.note_members = note_members;
            this.interval_members = matched.intervals;
        } else {
            console.log('scale name did not match any known scales');
            return;
        }

        return this;

    } else {
        console.log('scale name must be a string');
        return;
    }
};