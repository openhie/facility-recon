var async = require("async")
var counter = 1
async.parallel([
    function name1(callback) {
	counter++
        if(counter < 1){
	 name1((val)=>{

	 })
	}
	else
         callback(null, counter);
    },
    function(callback) {
        setTimeout(function() {
            callback(null, 'two');
        }, 100);
    }
],
// optional callback
function(err, results) {
console.log(results)
});
