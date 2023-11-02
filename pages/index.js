import Link from "next/link";

import React, { useState, useEffect, useRef } from "react";
import { Wrapper } from "@googlemaps/react-wrapper";
import ThreejsOverlayView from "@ubilabs/threejs-overlay-view";
import { CatmullRomCurve3, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Line2 } from "three/examples/jsm/lines/Line2.js";
import { LineMaterial } from "three/examples/jsm/lines/LineMaterial.js";
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js";
import fetchDirections from "../src/fetchDirections";


import * as THREE from "three";

const mapOptions = {
  mapId: process.env.NEXT_PUBLIC_MAP_ID,
  center: { lat: 10.015478, lng: 76.354477 },
  zoom: 18,
  disableDefaultUI: true,
  heading: 25,
  tilt: 80,
};

export default function App() {
  return (
    <Wrapper apiKey={process.env.NEXT_PUBLIC_MAP_API_KEY}>
      <MyMap />
    </Wrapper>
  );
}

function MyMap() {
  const [route, setRoute] = useState(null);
  const [map, setMap] = useState();
  const ref = useRef();

  useEffect(() => {
    setMap(new window.google.maps.Map(ref.current, mapOptions));
  }, []);

  return (
    <>
      <div ref={ref} id="map" />
      {map && <Directions setRoute={setRoute} />}
      {map && route && <Animate map={map} route={route} />}
    </>
  );
}

function Directions({ setRoute }) {
  const [origin] = useState("Infopark South Gate");
  const [destination] = useState("KINFRA Export Promotion Industrial Park Kochi");

  useEffect(() => {
    fetchDirections(origin, destination, setRoute);
  }, [origin, destination]);

  return (
    <div className="directions">
      <h4>Directions</h4>
      <b className="heading">Origin</b>
      <p className="text">{origin}</p>
      <b className="heading">Destination</b>
      <p className="text">{destination}</p>
    </div>
  );
}

const ANIMATION_MS = 15000;
const FRONT_VECTOR = new Vector3(0, -1, 0);

function Animate({ route, map }) {
  const overlayRef = useRef();
  const trackRef = useRef();
  const manRef = useRef();

  useEffect(() => {
    map.setCenter(route[Math.floor(route.length / 2)], 17);

    if (!overlayRef.current) {
      overlayRef.current = new ThreejsOverlayView(mapOptions.center);
      overlayRef.current.setMap(map);
    }

    const scene = overlayRef.current.getScene();
    const points = route.map((p) => overlayRef.current.latLngAltToVector3(p));
    const curve = new CatmullRomCurve3(points);

    if (trackRef.current) {
      scene.remove(trackRef.current);
    }
    trackRef.current = createTrackFromCurve(curve);
    scene.add(trackRef.current);


    loadModel().then((model) => {
      if (manRef.current) {
        scene.remove(manRef.current);
      }
      manRef.current = model;
      scene.add(manRef.current);
    });

    overlayRef.current.update = () => {
      trackRef.current.material.resolution.copy(
        overlayRef.current.getViewportSize()
      );

      if (manRef.current) {
        const progress = (performance.now() % ANIMATION_MS) / ANIMATION_MS;
        curve.getPointAt(progress, manRef.current.position);
        manRef.current.quaternion.setFromUnitVectors(
          FRONT_VECTOR,
          curve.getTangentAt(progress)
        );
        manRef.current.rotateX(Math.PI / 2);
      }

      overlayRef.current.requestRedraw();
    };

    return () => {
      scene.remove(trackRef.current);
      scene.remove(manRef.current);
    };
  }, [route]);
}

function createTrackFromCurve(curve) {
  const points = curve.getSpacedPoints(curve.points.length * 10);
  const positions = points.map((point) => point.toArray()).flat();

  return new Line2(
    new LineGeometry().setPositions(positions),
    new LineMaterial({
      color: 0xffb703,
      linewidth: 8,
    })
  );
}

async function loadModel() {
  const loader = new GLTFLoader();
  // Load the GLTF model.
  const object = await loader.loadAsync("/casual_man_character/scene1.gltf");
  console.log(object);
  const group = object.scene;
  group.scale.setScalar(10);

  // Assuming the model has animations, create an AnimationMixer.
  const mixer = new THREE.AnimationMixer(group);

  // Get the first animation clip (the default animation).
  const clip = object.animations[0];

  if (clip) {
    // Create an animation action and set it to play.
    const action = mixer.clipAction(clip);
    action.play();
  }

  // Update the mixer in your animation/render loop.
  function animate() {
    requestAnimationFrame(animate);
    mixer.update(0.01); // You can adjust the time delta as needed.
    // Render your 3D scene here.
  }
  animate();

  return group;
}


