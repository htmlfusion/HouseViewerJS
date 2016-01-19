var shader = `#ifdef GL_ES
precision highp float;
#endif

varying vec4 vRstq;
uniform mat4 projectorMat;

void main()
{
    vRstq = projectorMat * vec4(position, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
}`

module.exports = shader;
