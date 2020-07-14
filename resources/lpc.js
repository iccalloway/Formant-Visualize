findRoots = require('./node_modules/durand-kerner/roots');
resample = require('./downsample');
//TO-DO


/* Variables */
bw_threshold = 400;
freq_threshold = 90;
frequency_cutoff = 5000;
F = 50; //Frequency threshold for preemphasis

function preemphasis(F,signal,sr){
	alpha = Math.exp(-2*Math.PI*F*(1/sr));
	return(signal.map((x,i) => signal[i] -alpha*signal[Math.max(i-1,0)]));
}

/* Computes norm of array of numbers */
function norm(l,p=2){
	squared = l.map(x=> Math.pow(Math.abs(x),p));
	summed = squared.reduce((a,b) => a+b,0);
	return(Math.pow(summed,1/p));
}

/* Performs Auto-correlation*/
function xcorr(input) {
    output = []
    var n = input.length,
        norm, sum,  i, j;
    
    for (i = 0; i < n; i++) {
        sum = 0;
        for (j = 0; j < n; j++) {
            sum += (input[j] * (input[j+i] || 0)); // Pad input with zeroes
        }
        if (i === 0) norm = sum;
        output[i] = sum / norm;
    }
    return(output)
}   


/* Levinson-Durbin Algorithm - Returns coefficients, but not reflection parameters*/
function levinson_durbin(r, n){
  a_temp = []; /* n <= N = constant  */
  k=[]
  a=[]

  k[0] = 0.0;                          /* unused */
  a[0] = 1.0;
  a_temp[0] = 1.0;                          /* unnecessary but consistent */
  alpha = r[0];

  for(i=1; i<=n; i++){
    epsilon = r[i];                       /* epsilon = a[0]*r[i]; */
    for(j=1; j<i; j++){
        epsilon += a[j]*r[i-j];
    }
    a[i] = k[i] = -epsilon/alpha;
    alpha = alpha*(1.0 - k[i]*k[i]);
    for(j=1; j<i; j++){
        a_temp[j] = a[j] + k[i]*a[i-j];   /* update a[] array into temporary array */
    }
    for(j=1; j<i; j++){
        a[j] = a_temp[j];                 /* update a[] array */
    }
  }
  return(a)
}

/* Linear Predictive Coding*/
function lpc(signal, order){
	return(levinson_durbin(xcorr(signal),order));
}


function roots_to_formants(roots, sr){
	omega = roots[1].map((value,i) => Math.atan2(value,roots[0][i]));
	f = omega.map(x=> x*sr/(2*Math.PI));
	bw = roots[0].map((x,i) =>(-0.5*sr/(2*Math.PI)) * Math.log(norm([x,roots[1][i]])));
	formants = f.map((freq,idx) => (freq > freq_threshold && Math.abs(bw[idx]) < bw_threshold) ? freq: -1).filter(x=> x > -1).sort((a,b) => a -b );
	return(formants);
}

function get_formants(signal,order, sr){
	preemph = preemphasis(F,signal,sr);
	resampled = resample(preemph, frequency_cutoff*2,sr, 10);
	coeffs = lpc(resampled, order);
	roots = findRoots(coeffs);	
	formants = roots_to_formants(roots,frequency_cutoff*2);
	return(formants);	
}

module.exports = get_formants;
