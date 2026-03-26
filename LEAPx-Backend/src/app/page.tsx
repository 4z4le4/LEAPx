'use client';
import React, { useEffect } from 'react';

const Home = () => {
  useEffect(() => {
    window.location.href = 'https://leapx.eng.cmu.ac.th/';
  }, []);

  return (
    <div className="bg-black w-full min-h-screen flex flex-col items-center justify-center">
      <div className="relative w-28 h-28">
        <div className="loader">
          <div className="box1" />
          <div className="box2" />
          <div className="box3" />
        </div>
      </div>

      <div className="text-white text-3xl font-bold mt-10">
        LEAPx
      </div>
    </div>
  );
};

export default Home;
