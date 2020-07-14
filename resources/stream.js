//Load dependencies
var MicrophoneStream = require('./node_modules/microphone-stream/microphone-stream');
var get_formants = require('./lpc');
var noUiSlider = require('./node_modules/nouislider/distribute/nouislider.min');

//Helper Functions
function elem_mult(a,b){
	return(a.map((x,i) => x*b[i]));
}

function sum(a){
	return(a.reduce((b,c) => b+c, 0));
}

function mean(x){
	return(sum(x)/x.length);
}

//Exponential Discounted Weighting
function factor_weighting(smooth, factor){
	weights = new Array(smooth).fill(1).map((a,i)=> factor**i);
	return(weights.map(a=> a/sum(weights)));
}

function average_power(signal){
	return(mean(signal.map(x=> x**2)));
}

function Float32Concat(first, second)
{
    var firstLength = first.length,
        result = new Float32Array(firstLength + second.length);

    result.set(first);
    result.set(second, firstLength);

    return result;
}
//Settings 
var sr;
var power_threshold = -3; //Minimum log power to perform formant analysis
var order = 10;

//Formant Bounds
var f1_min = 150
var f1_max = 900;
var f2_min = 500
var f2_max = 2500
var audioChunks = [];
checks = 10;





//Smoothing-related variables
var smooth = 2; //Number of samples to smooth against
var factor = 0.5; //Disconting factor for previous formant estimates
var fweights = factor_weighting(smooth, factor);

//Edit document variable if appropriate
function safeReplace(item, a_temp, a, checkFun){
	if(checkFun(a_temp)){
		item.value = a_temp;
		return(a_temp);
	} else {
		console.log("Invalid input.");
		item.value = a;
		return(a);
	}
}

//Change user editable parameters
function changeSettings(){
	smooth_loc = document.getElementById('smooth');
	order_loc = document.getElementById('order');
	smooth = safeReplace(smooth_loc, parseInt(smooth_loc.value), smooth, Number.isInteger);
	order = safeReplace(order_loc, parseInt(order_loc.value), order, Number.isInteger);
	return;
}



//Cross-platform terms for getUserMedia
navigator.getUserMedia = ( navigator.getUserMedia ||
                       navigator.webkitGetUserMedia ||
                       navigator.mozGetUserMedia ||
                       navigator.msGetUserMedia)

//Process Microphone Audio
navigator.getUserMedia(
	{audio:true},
	function (stream){

		var f1s = [];
		var f2s = [];
	
		this.micStream = new MicrophoneStream(stream, {/*objectMode: true*/});
		//Processing data stream
	        this.micStream.on('data', function(chunk) {
          	      this.onDataAvailable(chunk);
	        }.bind(this));
		
		//Stream information
		this.micStream.on('format', function(data){
		sr = data.sampleRate; //Sampling Rate
		document.getElementById('sr').innerHTML=parseInt(sr)+" Hz";
		}.bind(this));
        
        this.onDataAvailable = function (chunk) {
        	if (chunk.length > 0) {
			var wavBuf = new Float32Array(chunk.buffer);
			audioChunks.push(wavBuf);	
			if (audioChunks.length > 1) {
				data = Float32Concat(audioChunks[0],audioChunks[1]);
				audioChunks = []
				power = Math.log10(average_power(data));
				//Check that is loud enough
				if(power > power_threshold){
					formants = get_formants(data,order,sr);
					subset = formants.slice(0,Math.min(2,formants.length));
					//Check that F1 is appropriate
					if(subset.length > 0 && subset[0] >= f1_min && subset[0] < f1_max){
						f1_position = 100*(subset[0]-f1_min)/(f1_max-f1_min);
						f1s.unshift(f1_position);
						if(f1s.length >= smooth){
							smoothedf1 = sum(elem_mult(f1s, fweights));
							document.getElementById('dot').style.top = smoothedf1.toString()+"%";
							f1s.pop();
						}
						//Check that F2 is appropriate
						if(subset.length > 1 && subset[1] >= f2_min && subset[1] < f2_max){
							f2_position = 100 - 100*(subset[1]-f2_min)/(f2_max-f2_min);
							f2s.unshift(f2_position);
							if(f2s.length >= smooth){
								smoothedf2 = sum(elem_mult(f2s, fweights));
								document.getElementById('dot').style.left = smoothedf2.toString()+"%";
								f2s.pop();
							}
						}
					}
				}
			}
		}
        }.bind(this);
        /*...*/
      }.bind(this),
	function(e){
		console.log(e);
	}
)

//On keypress
document.addEventListener("keydown", function(e){
        var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;

	//Reset shown word if return is pressed in text box
	if (e.target.nodeName == 'INPUT' || e.target.nodeName == 'TEXTAREA'){
		if (key==13){
			changeSettings();
		}
		return;
	}
	return;
});

//After window loads
window.addEventListener('load', function(x){
	for (var a = 0; a<=checks; a++){
		document.getElementById('f1values').innerHTML += '<div>'+Math.floor(f1_min + a*(f1_max-f1_min)/checks).toString()+'</div>';
		document.getElementById('f2values').innerHTML += '<div>'+Math.floor(f2_min + (checks-a)*(f2_max-f2_min)/checks).toString()+'</div>';
	}
	document.getElementById('smooth').value=smooth;
	document.getElementById('order').value=order;
});
