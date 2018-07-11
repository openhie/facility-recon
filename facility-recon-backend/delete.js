var Finder = require('fs-finder');

var filter = function(stat, path) {
	if(path.includes(db))
  return true
};

var files = Finder.from(__dirname + '/lib/dbArhives').filter(filter).findFiles((files)=>{
	console.log(files)
});