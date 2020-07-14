FFT = require('./node_modules/fft.js/lib/fft');

//TO-DO
//Fix Anti-Aliasing Filter

function sinc_interpolate(old_signal, index, precision){
	//Return nothing if the array is empty
	if(old_signal.length < 1){
		return(null);
	}

	//Return end elements if the index runs past the array 
	if (index >=old_signal.length){
		return(old_signal[old_signal.length-1]);
	}
	if (index <=0){
		return(old_signal[0]);
	}
	midleft = Math.floor(index); //left of fractional index
	//Return indexed value if there
	if(midleft==index){
		return(old_signal[index]);
	}
	midright = midleft + 1; // right of fractional index
	result = 0;

	//Adjust precision depth if too close to edge
	if (precision > midright ){
		precision = midright ;
	}
	if (precision > old_signal.length -1 - midleft){
		precision = old_signal.length -1 - midleft;
	}

	left = midright - precision; //How far out to look for sinc interp
	right = midleft + precision;

	a = Math.PI * (index - midleft); //???
	halfsina = 0.5*Math.sin(a);
	aa = a/(index-left+1);
	daa = Math.PI / (index-left+1);

	for(b=midleft; b >= left; b--){
		d = halfsina / a * (1+Math.cos(aa));
		result = result + old_signal[b]*d;
		a = a + Math.PI;
		aa = aa + daa;
		halfsina = -halfsina;
	}
	a = Math.PI * (midright - index);
	halfsina = 0.5*Math.sin(a);
	aa = a/(right-index+1);
	daa = Math.PI / (right-index+1);

	for(b=midright; b <= right; b++){
		d = halfsina / a * (1+Math.cos(aa));
		result = result + old_signal[b]*d;
		a = a + Math.PI;
		aa = aa + daa;
		halfsina = -halfsina;
	}
	return(result);
}


function lowPassFilter(sound,factor){
	//Use Low Pass Filter to Avoid Aliasing
	antiTurnAround = 1000; //Amount of zeros to pad signal with
	padSides = 2; //Number of sides to pad
	nfft = 1 << 32 - Math.clz32(sound.length + antiTurnAround * padSides); //Size of fft
	data = new Array(nfft).fill(0);
	for(var a=0; a<sound.length; a++){
		data[antiTurnAround+a] = sound[a];
	}

	//FFT Stuff
	f = new FFT(nfft);
	fdomain = f.createComplexArray();
	tdomain = f.createComplexArray();
	f.realTransform(fdomain,data);
	for (var i=Math.ceil(factor*nfft); i <=nfft; i++){
		fdomain[2*i] = 0; //Zero Real Part
		fdomain[2*i+1] = 0; //Zero Imaginary Part
	}
	f.inverseTransform(tdomain,fdomain);
	reals = f.fromComplexArray(tdomain);
	filtered=[];
	for(var i=0; i < sound.length; i++){
		filtered.push(reals[i+antiTurnAround]);
	}
	return(filtered);
};

function resample(sound, new_sr, old_sr, precision){
	var factor = new_sr/old_sr;
	var newSamples = Math.round(sound.length*new_sr/old_sr);
	
	if (factor < 1){
		sound = lowPassFilter(sound,factor);
	}
	newsound = new Array(0);

	if (precision <= 1){
		//Linear Interpolation
		for(var i =0; i< newSamples;i++){
			old_index = i*old_sr/new_sr;
			left_index = Math.floor(old_index);
			fraction = old_index - left_index;
			if (left_index < 0 || left_index > sound.length - 2){
				newsound.push(0);
			} else {
				newsound.push((1-fraction)*sound[left_index] + fraction*sound[left_index+1]);
			}
			
		}
	} else {
		//Sinc Interpolation
		for(var i =0; i< newSamples;i++){
			old_index = i*old_sr/new_sr;
			newsound.push(sinc_interpolate(sound,old_index,precision));
		}
	}
	return(newsound);
}

module.exports = resample;
